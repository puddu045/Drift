import { PillGradient } from '@/components/PillGradient';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useRef, useState } from 'react';
import { FlatList, ScrollView, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ApiError } from '@/lib/api';
import { colors, spacing, typography } from '@/theme';

import { acceptRequest, declineRequest } from './api';
import { cachedInbox, preloadInbox } from './preload';
import { useSession } from '@/features/auth/SessionProvider';

export function ConnectionsScreen() {
  const router = useRouter();
  const [segment, setSegment] = useState<'Chats' | 'Requests'>('Chats');
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
      if (version === generation.current) setError(err instanceof ApiError ? err.message : 'Could not load connections.');
    });
  }, [userId]);
  useFocusEffect(useCallback(() => {
    refresh();
    return () => { generation.current++; };
  }, [refresh]));

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
        <Text style={styles.title}>Connections</Text>
        <Text style={styles.subtitle}>People you&rsquo;ve connected with.</Text>
      </View>
      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.segments}>
        {(['Chats', 'Requests'] as const).map(tab => (
          <Pressable key={tab} accessibilityRole="tab" accessibilityState={{ selected: tab === segment }}
            style={[styles.segment, tab === segment && styles.active]} onPress={() => setSegment(tab)}>
            {tab === segment && <PillGradient />}
            <Text style={{ color: tab === segment ? 'white' : colors.textPrimary, fontWeight: '600' }}>
              {tab}{tab === 'Requests' && requests.length > 0 ? '  ' + requests.length : ''}
            </Text>
          </Pressable>
        ))}
      </View>
      {segment === 'Requests' && (
        <ScrollView contentContainerStyle={styles.section}>
          {requests.length === 0 && <Text style={styles.empty}>No incoming requests.</Text>}
          {requests.map((request) => (
            <Card key={request.id} style={styles.requestCard}>
              <View style={styles.authorRow}>
                <Avatar
                  name={request.senderProfile?.displayName}
                  photoUrl={request.senderProfile?.photoUrl}
                />
                <Text style={styles.requestName}>{request.senderProfile?.displayName ?? 'Someone'}</Text>
              </View>
              {request.introMessage && <Text style={styles.intro}>“{request.introMessage}”</Text>}
              <View style={styles.requestActions}>
                <Button label="Accept" variant="accept" onPress={() => onAccept(request.id)} style={styles.actionButton} />
                <Button
                  label="Decline"
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
          data={connections}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text style={styles.empty}>{inbox ? 'No connections yet.' : error ? '' : 'Loading chats...'}</Text>}
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
              <Card style={[styles.connectionCard, styles.authorRow]}>
                <Avatar
                  name={profiles[item.otherUserId]?.displayName}
                  photoUrl={profiles[item.otherUserId]?.photoUrl}
                />
                <View style={{ flex: 1 }}>
                <Text style={styles.connectionLabel}>{profiles[item.otherUserId]?.displayName ?? 'Someone'}</Text>
                {message && <Text numberOfLines={1} style={styles.meta}>{message.text}</Text>}
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  {message && <Text style={styles.meta}>{new Date(message.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</Text>}
                  {unread > 0 && <Text accessibilityLabel={unread + ' unread message notifications'} style={styles.badge}>{unread}</Text>}
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
  connectionLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.md,
    color: colors.textPrimary,
  },
  empty: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
});
