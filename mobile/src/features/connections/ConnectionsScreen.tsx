import { PillGradient } from '@/components/PillGradient';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, ScrollView, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ScreenContainer } from '@/components/ScreenContainer';
import { useTranslation } from '@/i18n';
import { ApiError } from '@/lib/api';
import { colors, spacing, typography } from '@/theme';

import { acceptRequest, declineRequest } from './api';
import { cachedInbox, preloadInbox } from './preload';
import { useSession } from '@/features/auth/SessionProvider';

export function ConnectionsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ segment?: string }>();
  const [segment, setSegment] = useState<'Chats' | 'Requests'>('Chats');
  const segmentLabels: Record<'Chats' | 'Requests', string> = {
    Chats: t('connections.chats'),
    Requests: t('connections.requests'),
  };
  const userId = useSession().session?.user.id;
  const [inbox, setInbox] = useState(() => userId ? cachedInbox(userId) : undefined);
  const { summaries = {}, badges = {}, requests = [], connections = [], profiles = {} } = inbox ?? {};
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const refresh = useCallback((force = false) => {
    if (!userId) return;
    const version = ++generation.current;
    preloadInbox(userId, force).then(data => {
      if (version === generation.current) {
        setInbox(data);
        setError(null);
      }
    }).catch((err: unknown) => {
      if (version === generation.current) setError(err instanceof ApiError ? err.message : t('connections.couldNotLoad'));
    });
  }, [userId]);
  useFocusEffect(useCallback(() => {
    refresh();
    return () => { generation.current++; };
  }, [refresh]));

  // One-shot signal from a notification tap (?segment=Requests) — apply it,
  // then clear it so it doesn't keep overriding a segment the user later
  // picks by hand.
  useFocusEffect(
    useCallback(() => {
      if (params.segment === 'Chats' || params.segment === 'Requests') {
        setSegment(params.segment);
        router.setParams({ segment: undefined });
      }
    }, [params.segment, router]),
  );

  // Most recently messaged first within each group — the backend orders
  // connections by when they were created, not by chat activity, so re-sort
  // here using the per-conversation summaries already fetched for the
  // preview text. Blocked chats (either direction) sink to the bottom,
  // greyed out, regardless of recency — still visible, just out of the way.
  const sortedConnections = useMemo(() => {
    const lastActivity = (c: (typeof connections)[number]) =>
      summaries[c.conversationId ?? '']?.lastMessage?.createdAt ?? c.createdAt;
    return [...connections].sort((a, b) => {
      if (a.isBlocked !== b.isBlocked) return a.isBlocked ? 1 : -1;
      return +new Date(lastActivity(b)) - +new Date(lastActivity(a));
    });
  }, [connections, summaries]);

  const onAccept = async (id: string) => {
    await acceptRequest(id);
    refresh(true);
  };

  const onDecline = async (id: string) => {
    await declineRequest(id);
    refresh(true);
  };

  return (
    <ScreenContainer floatingTabBar background="haze">
      <View style={styles.header}>
        <Ionicons name="people-outline" size={38} color={colors.textPrimary} />
        <Text style={styles.title}>{t('connections.title')}</Text>
        <Text style={styles.subtitle}>{t('connections.subtitle')}</Text>
      </View>
      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.segments}>
        {(['Chats', 'Requests'] as const).map(tab => (
          <Pressable key={tab} accessibilityRole="tab" accessibilityState={{ selected: tab === segment }}
            style={[styles.segment, tab === segment && styles.active]} onPress={() => setSegment(tab)}>
            {tab === segment && <PillGradient />}
            <Text style={{ color: tab === segment ? 'white' : colors.textPrimary, fontWeight: '600' }}>
              {segmentLabels[tab]}{tab === 'Requests' && requests.length > 0 ? '  ' + requests.length : ''}
            </Text>
          </Pressable>
        ))}
      </View>
      {segment === 'Requests' && (
        <ScrollView contentContainerStyle={[styles.section, requests.length === 0 && styles.sectionEmpty]}>
          {requests.length === 0 && <Text style={styles.empty}>{t('connections.noRequests')}</Text>}
          {requests.map((request) => (
            <Card key={request.id} style={styles.requestCard}>
              <View style={styles.authorRow}>
                <Avatar
                  name={request.senderProfile?.displayName}
                  photoUrl={request.senderProfile?.photoUrl}
                />
                <Text style={styles.requestName}>{request.senderProfile?.displayName ?? t('connections.someone')}</Text>
              </View>
              {request.introMessage && <Text style={styles.intro}>“{request.introMessage}”</Text>}
              <View style={styles.requestActions}>
                <Button label={t('connections.accept')} variant="accept" onPress={() => onAccept(request.id)} style={styles.actionButton} />
                <Button
                  label={t('connections.decline')}
                  variant="destructive"
                  onPress={() => onDecline(request.id)}
                  style={styles.actionButton}
                />
              </View>
            </Card>
          ))}
        </ScrollView>
      )}

      {segment === 'Chats' && <View style={[styles.section, { flex: 1 }]}>
        <FlatList
          data={sortedConnections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={sortedConnections.length === 0 && styles.sectionEmpty}
          ListEmptyComponent={<Text style={styles.empty}>{inbox ? t('connections.noConnections') : error ? '' : t('connections.loadingChats')}</Text>}
          renderItem={({ item }) => {
            const message = summaries[item.conversationId ?? '']?.lastMessage;
            const unread = badges[item.conversationId ?? ''] ?? 0;
            return (
            <Pressable
              onPress={() =>
                item.conversationId &&
                router.push({
                  pathname: '/(tabs)/connections/[conversationId]',
                  params: { conversationId: item.conversationId },
                })
              }
            >
              <Card style={[styles.connectionCard, styles.authorRow, item.isBlocked && styles.connectionCardBlocked]}>
                <Avatar
                  name={profiles[item.otherUserId]?.displayName}
                  photoUrl={profiles[item.otherUserId]?.photoUrl}
                />
                <View style={{ flex: 1 }}>
                <Text style={[styles.connectionLabel, item.isBlocked && styles.textBlocked]}>{profiles[item.otherUserId]?.displayName ?? t('connections.someone')}</Text>
                {item.isBlocked ? (
                  <Text style={[styles.meta, styles.textBlocked]}>Blocked</Text>
                ) : (
                  message && <Text numberOfLines={1} style={styles.meta}>{message.text}</Text>
                )}
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  {message && <Text style={styles.meta}>{new Date(message.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</Text>}
                  {unread > 0 && <Text accessibilityLabel={`${unread} ${t('connections.unreadSuffix')}`} style={styles.badge}>{unread}</Text>}
                </View>
              </Card>
            </Pressable>
          ); }}
        />
      </View>}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  segments: { flexDirection: 'row', gap: 8, marginHorizontal: spacing.lg, marginBottom: spacing.md },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 24, backgroundColor: '#F1EEF1' },
  active: { backgroundColor: '#192F54' },
  meta: { fontSize: 12, lineHeight: 18, color: colors.textSecondary },
  badge: { overflow: 'hidden', borderRadius: 12, color: 'white', backgroundColor: '#BB3558', paddingHorizontal: 6 },
  header: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  subtitle: { color: colors.textPrimary, fontSize: 16, marginTop: spacing.xs },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  error: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.sm,
    color: colors.danger,
    paddingHorizontal: spacing.lg,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  requestCard: {
    backgroundColor: 'rgba(255,249,246,0.72)',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  requestName: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
  },
  intro: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.md,
    color: colors.textPrimary,
    fontStyle: 'italic',
  },
  requestActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
  connectionCard: {
    borderRadius: 18,
    backgroundColor: '#FFFCFA',
    marginHorizontal: 4,
    marginTop: 5,
    marginBottom: spacing.sm,
  },
  connectionCardBlocked: {
    backgroundColor: '#EFEFEF',
    opacity: 0.6,
  },
  connectionLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.md,
    color: colors.textPrimary,
  },
  textBlocked: {
    color: colors.textSecondary,
  },
  empty: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
});
