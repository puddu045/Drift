import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ScreenContainer } from '@/components/ScreenContainer';
import { getPublicProfile } from '@/features/profile/api';
import { ApiError } from '@/lib/api';
import { getCached, setCached } from '@/lib/prefetchCache';
import { PREFETCH_KEYS } from '@/lib/usePrefetchTabs';
import { colors, spacing, typography } from '@/theme';

import {
  acceptRequest,
  Connection,
  ConnectionRequest,
  declineRequest,
  listConnections,
  listIncomingRequests,
} from './api';

export function ConnectionsScreen() {
  const router = useRouter();
  // Seeded from usePrefetchTabs (warmed right after sign-in) when present,
  // so a first visit this session can render immediately instead of a
  // blank list — refresh() below still runs regardless, to keep it fresh.
  const [requests, setRequests] = useState<ConnectionRequest[]>(
    () => getCached(PREFETCH_KEYS.connectionsRequests) ?? [],
  );
  const [connections, setConnections] = useState<Connection[]>(
    () => getCached(PREFETCH_KEYS.connectionsList) ?? [],
  );
  const [profiles, setProfiles] = useState<Record<string, { displayName: string; photoUrl: string | null }>>({});
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    Promise.all([listIncomingRequests(), listConnections()])
      .then(([reqs, conns]) => {
        setRequests(reqs);
        setConnections(conns);
        setCached(PREFETCH_KEYS.connectionsRequests, reqs);
        setCached(PREFETCH_KEYS.connectionsList, conns);
        conns.forEach((c) => {
          getPublicProfile(c.otherUserId)
            .then((profile) =>
              setProfiles((prev) => ({
                ...prev,
                [c.otherUserId]: { displayName: profile.displayName, photoUrl: profile.photoUrl },
              })),
            )
            .catch(() => {});
        });
      })
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : 'Could not load connections.'));
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const onAccept = async (id: string) => {
    await acceptRequest(id);
    refresh();
  };

  const onDecline = async (id: string) => {
    await declineRequest(id);
    refresh();
  };

  return (
    <ScreenContainer floatingTabBar background="pastel">
      <View style={styles.header}>
        <Text style={styles.title}>Connections</Text>
      </View>
      {error && <Text style={styles.error}>{error}</Text>}

      {requests.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Requests</Text>
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
                <Button label="Accept" onPress={() => onAccept(request.id)} style={styles.actionButton} />
                <Button
                  label="Decline"
                  variant="ghost"
                  onPress={() => onDecline(request.id)}
                  style={styles.actionButton}
                />
              </View>
            </Card>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Your connections</Text>
        <FlatList
          data={connections}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text style={styles.empty}>No connections yet.</Text>}
          renderItem={({ item }) => (
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
                <Text style={styles.connectionLabel}>{profiles[item.otherUserId]?.displayName ?? 'Someone'}</Text>
              </Card>
            </Pressable>
          )}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
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
