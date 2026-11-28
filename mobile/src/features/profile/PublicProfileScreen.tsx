import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { LanguagePickerModal } from '@/components/LanguagePickerModal';
import { MoodTag } from '@/components/MoodTag';
import { ScreenContainer } from '@/components/ScreenContainer';
import { useSession } from '@/features/auth/SessionProvider';
import { sendConnectionRequest } from '@/features/connections/api';
import { muteUser } from '@/features/mutes/api';
import { reportTarget } from '@/features/thoughts/api';
import { REPORT_REASONS } from '@/features/thoughts/reportReasons';
import { ThoughtDetailOverlay } from '@/features/universe/ThoughtDetailOverlay';
import { ApiError } from '@/lib/api';
import { useTranslatable } from '@/lib/useTranslatable';
import { colors, radius, spacing, typography } from '@/theme';

import { AuthoredThought, getPublicProfile, getPublicThoughtsByAuthor, PublicProfile, translateBio } from './api';

type Props = {
  userId: string;
};

// A real pushed screen (not a modal-on-a-modal) so that drilling into a
// thought's author from here, and from there into one of THEIR thoughts,
// doesn't nest indefinitely — see ThoughtDetailOverlay's viewerContextUserId.
export function PublicProfileScreen({ userId }: Props) {
  const router = useRouter();
  const { session } = useSession();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [thoughts, setThoughts] = useState<AuthoredThought[]>([]);
  const [reporting, setReporting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [viewingThought, setViewingThought] = useState<AuthoredThought | null>(null);

  const isSelf = userId === session?.user.id;
  const bioTranslation = useTranslatable(() => translateBio(userId));

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
    <ScreenContainer background="haze">
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} accessibilityLabel="Back">
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
      </View>

      {!profile ? (
        <ActivityIndicator color={colors.accent} style={styles.loading} />
      ) : (
        <View style={styles.content}>
          <View style={styles.profileRow}>
            <Avatar name={profile.displayName} photoUrl={profile.photoUrl} size={56} />
            <View style={styles.profileText}>
              <Text style={styles.name}>{profile.displayName}</Text>
              <Text style={styles.username}>@{profile.username}</Text>
            </View>
          </View>
          {profile.bio && (
            <View>
              <Text style={styles.bio}>{bioTranslation.text ?? profile.bio}</Text>
              <Pressable onPress={bioTranslation.toggle} disabled={bioTranslation.loading}>
                <Text style={styles.translateLink}>
                  {bioTranslation.loading
                    ? 'Translating…'
                    : bioTranslation.showingTranslation
                      ? 'Show original'
                      : 'Translate'}
                </Text>
              </Pressable>
              {bioTranslation.error && <Text style={styles.actionMessage}>{bioTranslation.error}</Text>}
            </View>
          )}
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
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Image
                  source={require('../../../assets/paper-plane-flourish.png')}
                  style={styles.emptyIcon}
                  resizeMode="contain"
                />
                <Text style={styles.empty}>No public thoughts yet.</Text>
              </View>
            }
            renderItem={({ item }) => (
              <Pressable onPress={() => setViewingThought(item)}>
                <Card style={styles.thoughtCard}>
                  <MoodTag mood={item.mood} />
                  <Text style={styles.thoughtText}>{item.text}</Text>
                </Card>
              </Pressable>
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
        </View>
      )}

      {bioTranslation.needsLanguage && (
        <LanguagePickerModal
          selected={null}
          onCancel={bioTranslation.dismissLanguagePrompt}
          onSelect={bioTranslation.onLanguageChosen}
        />
      )}

      {viewingThought && (
        <ThoughtDetailOverlay
          thought={viewingThought}
          viewerContextUserId={userId}
          onClose={() => setViewingThought(null)}
          onDeleted={() => {
            setThoughts((prev) => prev.filter((t) => t.id !== viewingThought.id));
            setViewingThought(null);
          }}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    minHeight: 56,
    justifyContent: 'center',
  },
  back: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
  },
  loading: {
    marginTop: spacing.xl,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
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
  translateLink: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: '#25466E',
    marginTop: 4,
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
    borderColor: 'rgba(21, 33, 59, 0.25)',
  },
  interestLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: spacing.sm,
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
  emptyState: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    gap: spacing.xs,
  },
  emptyIcon: {
    width: 40,
    height: 40,
    opacity: 0.6,
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
});
