import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { MoodTag } from '@/components/MoodTag';
import { useSession } from '@/features/auth/SessionProvider';
import { sendConnectionRequest } from '@/features/connections/api';
import { muteUser } from '@/features/mutes/api';
import { reportTarget } from '@/features/thoughts/api';
import { REPORT_REASONS } from '@/features/thoughts/reportReasons';
import { ApiError } from '@/lib/api';
import { colors, radius, spacing, typography } from '@/theme';

import { AuthoredThought, getPublicProfile, getPublicThoughtsByAuthor, PublicProfile } from './api';

type Props = {
  userId: string;
  onClose: () => void;
};

export function UserProfileModal({ userId, onClose }: Props) {
  const { session } = useSession();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [thoughts, setThoughts] = useState<AuthoredThought[]>([]);
  const [reporting, setReporting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const isSelf = userId === session?.user.id;

  // The caller renders this conditionally on `userId`, so it mounts fresh
  // each time a different user's profile is opened — same pattern as
  // EditFieldModal. No reset-on-change effect needed.
  useEffect(() => {
    getPublicProfile(userId).then(setProfile).catch(() => {});
    getPublicThoughtsByAuthor(userId).then(setThoughts).catch(() => {});
  }, [userId]);

  const onConnect = async () => {
    try {
      await sendConnectionRequest(userId);
      setActionMessage('Connection request sent.');
    } catch (err) {
      setActionMessage(err instanceof ApiError ? err.message : 'Could not send a request.');
    }
  };

  const onReport = async (reason: string) => {
    await reportTarget('profile', userId, reason);
    setReporting(false);
    setActionMessage('Report sent.');
  };

  const onMute = async () => {
    await muteUser(userId);
    setActionMessage('Muted — you won’t see their thoughts anymore.');
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <View style={styles.card}>
          {!profile ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <>
              <View style={styles.profileRow}>
                <Avatar name={profile.displayName} photoUrl={profile.photoUrl} size={56} />
                <View style={styles.profileText}>
                  <Text style={styles.name}>{profile.displayName}</Text>
                  <Text style={styles.username}>@{profile.username}</Text>
                </View>
              </View>
              {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}
              {profile.interests.length > 0 && (
                <View style={styles.interests}>
                  {profile.interests.map((interest) => (
                    <View key={interest} style={styles.interestChip}>
                      <Text style={styles.interestLabel}>{interest}</Text>
                    </View>
                  ))}
                </View>
              )}

              <FlatList
                data={thoughts}
                keyExtractor={(item) => item.id}
                style={styles.list}
                ListEmptyComponent={<Text style={styles.empty}>No public thoughts yet.</Text>}
                renderItem={({ item }) => (
                  <Card style={styles.thoughtCard}>
                    <MoodTag mood={item.mood} />
                    <Text style={styles.thoughtText}>{item.text}</Text>
                  </Card>
                )}
              />

              {!isSelf && (
                <>
                  {actionMessage && <Text style={styles.actionMessage}>{actionMessage}</Text>}
                  {reporting ? (
                    <View style={styles.reportReasons}>
                      {REPORT_REASONS.map((reason) => (
                        <Pressable key={reason} style={styles.reportReasonPill} onPress={() => onReport(reason)}>
                          <Text style={styles.reportReasonLabel}>{reason}</Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : (
                    <View style={styles.actions}>
                      <Button label="Connect" onPress={onConnect} style={styles.actionButton} />
                      <Button label="Mute" variant="ghost" onPress={onMute} style={styles.actionButton} />
                      <Button
                        label="Report"
                        variant="ghost"
                        onPress={() => setReporting(true)}
                        style={styles.actionButton}
                      />
                    </View>
                  )}
                </>
              )}
            </>
          )}

          <Pressable onPress={onClose} accessibilityLabel="Close profile">
            <Text style={styles.close}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(16, 26, 53, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    maxHeight: '80%',
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  profileText: {
    flex: 1,
  },
  name: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  username: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  bio: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  interests: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  interestChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  interestLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
  },
  list: {
    flexGrow: 0,
  },
  thoughtCard: {
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  thoughtText: {
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
  actionMessage: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  actionButton: {
    flex: 1,
  },
  reportReasons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  reportReasonPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  reportReasonLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
  },
  close: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
