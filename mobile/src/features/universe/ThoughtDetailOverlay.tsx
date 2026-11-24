import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn, ZoomOut } from 'react-native-reanimated';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { MoodTag } from '@/components/MoodTag';
import { blockUser } from '@/features/blocks/api';
import { sendConnectionRequest } from '@/features/connections/api';
import { useSession } from '@/features/auth/SessionProvider';
import { UserProfileModal } from '@/features/profile/UserProfileModal';
import {
  deleteThought,
  getThought,
  reportTarget,
  replyToThought,
  Thought,
  ThoughtDetail,
  toggleReaction,
} from '@/features/thoughts/api';
import { REPORT_REASONS } from '@/features/thoughts/reportReasons';
import { ApiError } from '@/lib/api';
import { colors, radius, spacing, typography } from '@/theme';

const REACTIONS: { type: Parameters<typeof toggleReaction>[1]; label: string }[] = [
  { type: 'heart', label: 'Heart' },
  { type: 'relate', label: 'Relate' },
  { type: 'beautiful', label: 'Beautiful' },
  { type: 'thoughtful', label: 'Thoughtful' },
  { type: 'hug', label: 'Hug' },
];

type Props = {
  thought: Thought;
  onClose: () => void;
  onDeleted: () => void;
};

export function ThoughtDetailOverlay({ thought, onClose, onDeleted }: Props) {
  const { session } = useSession();
  const [detail, setDetail] = useState<ThoughtDetail | null>(null);
  const [myReactions, setMyReactions] = useState<Set<string>>(new Set());
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [viewingAuthorId, setViewingAuthorId] = useState<string | null>(null);

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

  // Only viewable when the author opted to reveal identity — an anonymous
  // author's userId must never become a way to look up their profile. Tapping
  // an anonymous avatar still gives feedback rather than silently doing nothing.
  const onViewAuthor = (authorId: string, author: { displayName: string; photoUrl: string | null } | null) => {
    if (!author) {
      setActionMessage('This person has chosen to stay anonymous.');
      return;
    }
    setViewingAuthorId(authorId);
  };

  return (
    <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(150)} style={styles.backdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
      <Animated.View entering={ZoomIn.duration(220)} exiting={ZoomOut.duration(160)} style={styles.card}>
        <View style={styles.topRow}>
          {detail ? (
            <Pressable style={styles.authorRow} onPress={() => onViewAuthor(detail.authorId, detail.author)}>
              <Avatar name={detail.author?.displayName} photoUrl={detail.author?.photoUrl} size={28} />
              <Text style={styles.authorName}>{detail.author?.displayName ?? 'Anonymous'}</Text>
            </Pressable>
          ) : (
            <View />
          )}
          {!isOwnThought && (
            <Pressable
              style={styles.quickReportButton}
              onPress={() => setReporting(true)}
              accessibilityLabel="Report this thought"
            >
              <Text style={styles.quickReportLabel}>⚑ Report</Text>
            </Pressable>
          )}
        </View>
        <MoodTag mood={thought.mood} />
        <Text style={styles.text}>{thought.text}</Text>

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
                <View key={reply.id} style={styles.replyItem}>
                  <Pressable onPress={() => onViewAuthor(reply.authorId, reply.author)}>
                    <Avatar name={reply.author?.displayName} photoUrl={reply.author?.photoUrl} size={26} />
                  </Pressable>
                  <Text style={styles.reply}>{reply.text}</Text>
                </View>
              ))
            )}
          </View>
        )}

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
                <Button label="Block" variant="ghost" onPress={onBlock} style={styles.actionButton} />
              </>
            )}
          </View>
        )}

        <Pressable onPress={onClose} accessibilityLabel="Close thought">
          <Text style={styles.close}>Let it drift away</Text>
        </Pressable>
      </Animated.View>

      {viewingAuthorId && (
        <UserProfileModal userId={viewingAuthorId} onClose={() => setViewingAuthorId(null)} />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(16, 26, 53, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    maxHeight: '80%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
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
    borderColor: colors.border,
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
  reply: {
    flex: 1,
    fontFamily: typography.fontFamily,
    fontSize: typography.size.sm,
    color: colors.textPrimary,
    paddingTop: 4,
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
    borderWidth: 1,
    borderColor: colors.border,
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
});
