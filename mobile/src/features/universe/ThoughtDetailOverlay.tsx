import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeOut, ZoomIn, ZoomOut } from 'react-native-reanimated';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { LanguagePickerModal } from '@/components/LanguagePickerModal';
import { MoodTag } from '@/components/MoodTag';
import { blockUser } from '@/features/blocks/api';
import { sendConnectionRequest } from '@/features/connections/api';
import { useSession } from '@/features/auth/SessionProvider';
import { muteUser } from '@/features/mutes/api';
import {
  deleteThought,
  getThought,
  Reply,
  reportTarget,
  replyToThought,
  Thought,
  ThoughtDetail,
  toggleReaction,
  translateReply,
  translateThought,
} from '@/features/thoughts/api';
import { REPORT_REASONS } from '@/features/thoughts/reportReasons';
import { ApiError } from '@/lib/api';
import { useTranslatable } from '@/lib/useTranslatable';
import { colors, radius, spacing, typography } from '@/theme';

const REACTIONS: { type: Parameters<typeof toggleReaction>[1]; label: string }[] = [
  { type: 'heart', label: 'Heart' },
  { type: 'relate', label: 'Relate' },
  { type: 'beautiful', label: 'Beautiful' },
  { type: 'thoughtful', label: 'Thoughtful' },
  { type: 'hug', label: 'Hug' },
];

type AuthorIdentity = { displayName: string; photoUrl: string | null };

type Props = {
  thought: Thought;
  onClose: () => void;
  onDeleted: () => void;
  /** The userId of the profile this overlay was opened from (if any) — e.g.
   * when PublicProfileScreen opens one of that user's own thoughts. Their
   * avatar is already known to be "this profile", so it's shown but not
   * made tappable again, which is what stops the bubble → profile → thought
   * → profile → ... loop. Any *other* author (e.g. someone else's reply)
   * stays tappable as usual. */
  viewerContextUserId?: string;
};

export function ThoughtDetailOverlay({ thought, onClose, onDeleted, viewerContextUserId }: Props) {
  const router = useRouter();
  const { session } = useSession();
  const [detail, setDetail] = useState<ThoughtDetail | null>(null);
  const [myReactions, setMyReactions] = useState<Set<string>>(new Set());
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [previewAuthor, setPreviewAuthor] = useState<{ id: string } & AuthorIdentity | null>(null);
  const [expanded, setExpanded] = useState(false);
  const translation = useTranslatable(() => translateThought(thought.id));

  useEffect(() => {
    let cancelled = false;
    getThought(thought.id).then((result) => {
      if (!cancelled) setDetail(result);
    });
    return () => {
      cancelled = true;
    };
  }, [thought.id]);

  const isOwnThought = detail?.authorId === session?.user.id;

  const onReact = async (type: (typeof REACTIONS)[number]['type']) => {
    const { reacted } = await toggleReaction(thought.id, type);
    setMyReactions((prev) => {
      const next = new Set(prev);
      if (reacted) next.add(type);
      else next.delete(type);
      return next;
    });
  };

  const onSendReply = async () => {
    if (!replyText.trim()) return;
    setSendingReply(true);
    const reply = await replyToThought(thought.id, replyText.trim());
    setSendingReply(false);
    setReplyText('');
    setDetail((prev) => (prev ? { ...prev, replies: [...prev.replies, reply] } : prev));
  };

  const onReport = async (reason: string) => {
    await reportTarget('thought', thought.id, reason);
    setReporting(false);
  };

  const onDelete = async () => {
    await deleteThought(thought.id);
    onDeleted();
  };

  const onConnect = async () => {
    if (!detail) return;
    try {
      await sendConnectionRequest(detail.authorId);
      setActionMessage('Connection request sent.');
    } catch (err) {
      setActionMessage(err instanceof ApiError ? err.message : 'Could not send a request.');
    }
  };

  const onBlock = async () => {
    if (!detail) return;
    await blockUser(detail.authorId);
    onDeleted(); // Reuse the same "remove from view and close" behavior as delete.
  };

  const onMute = async () => {
    if (!detail) return;
    await muteUser(detail.authorId);
    setActionMessage('Muted — you won’t see their thoughts anymore.');
  };

  // Only viewable when the author opted to reveal identity — an anonymous
  // author's userId must never become a way to look up their profile. Tapping
  // an anonymous avatar still gives feedback rather than silently doing nothing.
  const onViewAuthor = (authorId: string, author: AuthorIdentity | null) => {
    if (!author) {
      setActionMessage('This person has chosen to stay anonymous.');
      return;
    }
    setPreviewAuthor({ id: authorId, ...author });
  };

  const onOpenFullProfile = () => {
    if (!previewAuthor) return;
    const userId = previewAuthor.id;
    setPreviewAuthor(null);
    router.push({ pathname: '/profiles/[userId]', params: { userId } });
  };

  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(150)}
      style={[styles.backdrop, expanded && styles.backdropExpanded]}
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
      <Animated.View
        entering={ZoomIn.duration(220)}
        exiting={ZoomOut.duration(160)}
        style={[styles.card, expanded && styles.cardExpanded]}
      >
        <View style={styles.topRow}>
          {detail ? (
            detail.authorId === viewerContextUserId ? (
              <View style={styles.authorRow}>
                <Avatar name={detail.author?.displayName} photoUrl={detail.author?.photoUrl} size={28} />
                <Text style={styles.authorName}>{detail.author?.displayName ?? 'Anonymous'}</Text>
              </View>
            ) : (
              <Pressable style={styles.authorRow} onPress={() => onViewAuthor(detail.authorId, detail.author)}>
                <Avatar name={detail.author?.displayName} photoUrl={detail.author?.photoUrl} size={28} />
                <Text style={styles.authorName}>{detail.author?.displayName ?? 'Anonymous'}</Text>
              </Pressable>
            )
          ) : (
            <View />
          )}
          <View style={styles.topRowActions}>
            {!isOwnThought && (
              <Pressable
                style={styles.quickReportButton}
                onPress={() => setReporting(true)}
                accessibilityLabel="Report this thought"
              >
                <Text style={styles.quickReportLabel}>⚑ Report</Text>
              </Pressable>
            )}
            <Pressable
              style={styles.expandButton}
              onPress={() => setExpanded((prev) => !prev)}
              accessibilityLabel={expanded ? 'Shrink thought' : 'Expand thought to full screen'}
            >
              <Ionicons name={expanded ? 'contract-outline' : 'expand-outline'} size={18} color={colors.textPrimary} />
            </Pressable>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <MoodTag mood={thought.mood} />
          <Text style={styles.text}>{translation.text ?? thought.text}</Text>
          <Pressable onPress={translation.toggle} disabled={translation.loading}>
            <Text style={styles.translateLink}>
              {translation.loading
                ? 'Translating…'
                : translation.showingTranslation
                  ? 'Show original'
                  : 'Translate'}
            </Text>
          </Pressable>

          <View style={styles.reactionRow}>
            {REACTIONS.map((reaction) => (
              <Pressable
                key={reaction.type}
                style={[styles.reactionPill, myReactions.has(reaction.type) && styles.reactionPillActive]}
                onPress={() => onReact(reaction.type)}
                accessibilityLabel={reaction.label}
              >
                <Text style={styles.reactionLabel}>{reaction.label}</Text>
              </Pressable>
            ))}
          </View>

          {!detail ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <View style={styles.replies}>
              {detail.replies.length === 0 ? (
                <Text style={styles.emptyReplies}>No replies yet.</Text>
              ) : (
                detail.replies.map((reply) => (
                  <ReplyRow
                    key={reply.id}
                    reply={reply}
                    isContextAuthor={reply.authorId === viewerContextUserId}
                    onViewAuthor={onViewAuthor}
                  />
                ))
              )}
            </View>
          )}

          {actionMessage && <Text style={styles.actionMessage}>{actionMessage}</Text>}

          {reporting ? (
            <View style={styles.reportReasons}>
              {REPORT_REASONS.map((reason) => (
                <Pressable key={reason} style={styles.reportReasonPill} onPress={() => onReport(reason)}>
                  <Text style={styles.reactionLabel}>{reason}</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={styles.actions}>
              {isOwnThought ? (
                <Button label="Delete" variant="ghost" onPress={onDelete} style={styles.actionButton} />
              ) : (
                <>
                  <Button label="Connect" onPress={onConnect} style={styles.actionButton} />
                  <Button label="Mute" variant="ghost" onPress={onMute} style={styles.actionButton} />
                  <Button label="Block" variant="ghost" onPress={onBlock} style={styles.actionButton} />
                </>
              )}
            </View>
          )}
        </ScrollView>

        <View style={styles.replyRow}>
          <TextInput
            style={styles.replyInput}
            value={replyText}
            onChangeText={setReplyText}
            placeholder="Write a reply..."
            placeholderTextColor={colors.textSecondary}
            maxLength={280}
          />
          <Button label="Send" onPress={onSendReply} disabled={sendingReply || !replyText.trim()} />
        </View>

        <Pressable onPress={onClose} accessibilityLabel="Close thought">
          <Text style={styles.close}>Let it drift away</Text>
        </Pressable>
      </Animated.View>

      {translation.needsLanguage && (
        <LanguagePickerModal
          selected={null}
          onCancel={translation.dismissLanguagePrompt}
          onSelect={translation.onLanguageChosen}
        />
      )}

      {previewAuthor && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setPreviewAuthor(null)}>
          <View style={styles.previewBackdrop}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setPreviewAuthor(null)}
              accessibilityLabel="Close"
            />
            <View style={styles.previewCard}>
              <Avatar name={previewAuthor.displayName} photoUrl={previewAuthor.photoUrl} size={72} />
              <Text style={styles.previewName}>{previewAuthor.displayName}</Text>
              <Button label="View profile" onPress={onOpenFullProfile} style={styles.previewButton} />
              <Pressable onPress={() => setPreviewAuthor(null)}>
                <Text style={styles.close}>Close</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}
    </Animated.View>
  );
}

function ReplyRow({
  reply,
  isContextAuthor,
  onViewAuthor,
}: {
  reply: Reply;
  isContextAuthor: boolean;
  onViewAuthor: (authorId: string, author: AuthorIdentity | null) => void;
}) {
  const translation = useTranslatable(() => translateReply(reply.thoughtId, reply.id));

  return (
    <View style={styles.replyItem}>
      {isContextAuthor ? (
        <Avatar name={reply.author?.displayName} photoUrl={reply.author?.photoUrl} size={26} />
      ) : (
        <Pressable onPress={() => onViewAuthor(reply.authorId, reply.author)}>
          <Avatar name={reply.author?.displayName} photoUrl={reply.author?.photoUrl} size={26} />
        </Pressable>
      )}
      <View style={styles.replyTextCol}>
        <Text style={styles.reply}>{translation.text ?? reply.text}</Text>
        <Pressable onPress={translation.toggle} disabled={translation.loading}>
          <Text style={styles.translateLink}>
            {translation.loading
              ? 'Translating…'
              : translation.showingTranslation
                ? 'Show original'
                : 'Translate'}
          </Text>
        </Pressable>
      </View>

      {translation.needsLanguage && (
        <LanguagePickerModal
          selected={null}
          onCancel={translation.dismissLanguagePrompt}
          onSelect={translation.onLanguageChosen}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(16, 26, 53, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  backdropExpanded: {
    padding: 0,
  },
  card: {
    width: '92%',
    maxWidth: 400,
    height: '72%',
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardExpanded: {
    width: '100%',
    maxWidth: undefined,
    height: '100%',
    borderRadius: 0,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  text: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.lg,
    color: colors.textPrimary,
    lineHeight: 28,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topRowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  quickReportButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  quickReportLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.xs,
    color: colors.danger,
  },
  expandButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  authorName: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
  },
  replyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  reactionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  reactionPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(21, 33, 59, 0.25)',
  },
  reactionPillActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(169, 201, 245, 0.16)',
  },
  reactionLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
  },
  replies: {
    gap: spacing.xs,
  },
  emptyReplies: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  replyTextCol: {
    flex: 1,
    gap: 2,
  },
  reply: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.sm,
    color: colors.textPrimary,
    paddingTop: 4,
  },
  translateLink: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.accent,
  },
  replyRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  replyInput: {
    flex: 1,
    minHeight: 40,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: 'rgba(21, 33, 59, 0.3)',
    paddingHorizontal: spacing.sm,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontSize: typography.size.sm,
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
  close: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  previewBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(16, 26, 53, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  previewCard: {
    width: '80%',
    maxWidth: 320,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  previewName: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  previewButton: {
    width: '100%',
    marginTop: spacing.xs,
  },
});
