import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useIsFocused, useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/ScreenContainer';

import { DreamyBackground } from '@/components/DreamyBackground';
import { SendButton } from '@/components/SendButton';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { LanguagePickerModal } from '@/components/LanguagePickerModal';
import { MoodTag } from '@/components/MoodTag';
import { useSession } from '@/features/auth/SessionProvider';
import { blockUser } from '@/features/blocks/api';
import { sendConnectionRequest } from '@/features/connections/api';
import { confirmIdentityReveal } from '@/features/connections/confirmIdentityReveal';
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
import { useTranslation } from '@/i18n';
import { ApiError } from '@/lib/api';
import { confirmAction } from '@/lib/confirm';
import { useTranslatable } from '@/lib/useTranslatable';
import { colors, radius, spacing, typography } from '@/theme';

const REACTION_KEYS = {
  heart: 'reaction.heart',
  relate: 'reaction.relate',
  beautiful: 'reaction.beautiful',
  thoughtful: 'reaction.thoughtful',
  hug: 'reaction.hug',
} as const;

const REACTIONS: { type: Parameters<typeof toggleReaction>[1] }[] = [
  { type: 'heart' },
  { type: 'relate' },
  { type: 'beautiful' },
  { type: 'thoughtful' },
  { type: 'hug' },
];

// REPORT_REASONS values are sent to the backend as-is (English) — only the
// displayed label is translated.
const REPORT_REASON_KEYS: Record<string, 'reportReason.spam' | 'reportReason.harassment' | 'reportReason.harmfulContent' | 'reportReason.other'> = {
  Spam: 'reportReason.spam',
  Harassment: 'reportReason.harassment',
  'Harmful content': 'reportReason.harmfulContent',
  Other: 'reportReason.other',
};

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
  /** Opens straight into the reply box, focused and ready to type — e.g.
   * from Destiny's "Reply" choice, which skips its own inline reply UI in
   * favor of this same overlay everything else uses. */
  autoFocusReply?: boolean;
  /** Opens already showing the translation — e.g. the caller's own compact
   * card was already showing one for this same thought, and this overlay
   * is a second, independent view of it. */
  initialShowTranslation?: boolean;
};

export function ThoughtDetailOverlay({
  thought,
  onClose,
  onDeleted,
  viewerContextUserId,
  autoFocusReply,
  initialShowTranslation,
}: Props) {
  const router = useRouter();
  const { t } = useTranslation();
  const { session } = useSession();
  const [detail, setDetail] = useState<ThoughtDetail | null>(null);
  const [myReactions, setMyReactions] = useState<Set<string>>(new Set());
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [previewAuthor, setPreviewAuthor] = useState<{ id: string } & AuthorIdentity | null>(null);
  const focused = useIsFocused();
  const translation = useTranslatable(() => translateThought(thought.id), { autoStart: initialShowTranslation });

  useEffect(() => {
    let cancelled = false;
    getThought(thought.id).then((result) => {
      if (!cancelled) setDetail(result);
    });
    return () => {
      cancelled = true;
    };
  }, [thought.id]);

  const isOwnThought = detail?.isOwnThought ?? false;

  const onReact = async (type: (typeof REACTIONS)[number]['type']) => {
    const { reacted } = await toggleReaction(thought.id, type);
    setDetail(prev => prev && ({ ...prev, _count: { reactions: Math.max(0, prev._count.reactions + (reacted ? 1 : -1)) } }));
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
    setReporting(false);
    const confirmed = await confirmAction('Report this thought?', `Reason: ${reason}. This can't be undone.`, 'Report');
    if (!confirmed) return;
    await reportTarget('thought', thought.id, reason);
  };

  const onDelete = async () => {
    await deleteThought(thought.id);
    onDeleted();
  };

  const onConnect = async () => {
    if (!detail?.authorId) {
      setActionMessage(t('thought.anonymousAuthor'));
      return;
    }
    if (!session) return;
    const proceed = await confirmIdentityReveal(session.user.id);
    if (!proceed) return;
    try {
      await sendConnectionRequest(detail.authorId);
      setActionMessage(t('publicProfile.connectionRequestSent'));
    } catch (err) {
      setActionMessage(err instanceof ApiError ? err.message : t('publicProfile.couldNotSendRequest'));
    }
  };

  const onBlock = async () => {
    if (!detail?.authorId) {
      setActionMessage(t('thought.anonymousAuthor'));
      return;
    }
    const confirmed = await confirmAction(
      'Block this person?',
      'You won’t see their thoughts anymore, and you won’t be able to message each other until you unblock them. You can unblock them later from your profile.',
      'Block',
    );
    if (!confirmed) return;
    await blockUser(detail.authorId);
    onDeleted(); // Reuse the same "remove from view and close" behavior as delete.
  };

  const onMute = async () => {
    if (!detail?.authorId) {
      setActionMessage(t('thought.anonymousAuthor'));
      return;
    }
    await muteUser(detail.authorId);
    setActionMessage(t('publicProfile.mutedConfirm'));
  };

  // Only viewable when the author opted to reveal identity — an anonymous
  // author's userId must never become a way to look up their profile. Tapping
  // an anonymous avatar still gives feedback rather than silently doing nothing.
  const onViewAuthor = (authorId: string | undefined, author: AuthorIdentity | null) => {
    if (!author || !authorId) {
      setActionMessage(t('thought.anonymousAuthor'));
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
    <Modal visible={focused} presentationStyle="fullScreen" animationType="slide" onRequestClose={onClose}>
      <ScreenContainer background="haze">
      <View style={styles.card}>
        <View style={styles.topRow}>
          <Pressable onPress={onClose} accessibilityLabel={t('thought.closeThought')} style={styles.back}>
            <Ionicons name="chevron-back" size={25} color={colors.textPrimary} />
          </Pressable>
          <View style={styles.topRowActions}>
            {!isOwnThought && (
              <Pressable
                style={styles.quickReportButton}
                onPress={() => setReporting(true)}
                accessibilityLabel={t('thought.reportThought')}
              >
                <Text style={styles.quickReportLabel}>⚑ {t('thought.report')}</Text>
              </Pressable>
            )}
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.thoughtPanel}>
          {detail ? (
            detail.authorId === viewerContextUserId ? (
              <View style={styles.authorRow}>
                <Avatar name={detail.author?.displayName} photoUrl={detail.author?.photoUrl} size={40} />
                <Text style={styles.authorName}>{detail.author?.displayName ?? t('common.anonymous')}</Text>
              </View>
            ) : (
              <Pressable style={styles.authorRow} onPress={() => onViewAuthor(detail.authorId, detail.author)}>
                <Avatar name={detail.author?.displayName} photoUrl={detail.author?.photoUrl} size={40} />
                <Text style={styles.authorName}>{detail.author?.displayName ?? t('common.anonymous')}</Text>
              </Pressable>
            )
          ) : (
            <View />
          )}
            <MoodTag mood={thought.mood} />
            <Text style={styles.text}>{translation.text ?? thought.text}</Text>
            {!isOwnThought && (
              <Pressable style={styles.translateRow} onPress={translation.toggle} disabled={translation.loading}>
                <Text style={styles.translateLink}>
                  {translation.loading
                    ? t('common.translating')
                    : translation.showingTranslation
                      ? t('common.showOriginal')
                      : t('common.translate')}
                </Text>
                <MaterialIcons name="translate" size={14} color="#234A74" />
              </Pressable>
            )}
            {translation.error && <Text style={styles.actionMessage}>{translation.error}</Text>}

            {detail && <Text style={styles.engagement}>{detail._count.reactions} {t('thought.reactionsLabel')}   /   {detail.replies.length} {t('thought.repliesLabel')}</Text>}
            <View style={styles.reactionRow}>
              {REACTIONS.map((reaction) => (
                <Pressable
                  key={reaction.type}
                  style={[styles.reactionPill, myReactions.has(reaction.type) && styles.reactionPillActive]}
                  onPress={() => onReact(reaction.type)}
                  accessibilityLabel={t(REACTION_KEYS[reaction.type])}
                >
                  <Text style={styles.reactionLabel}>{t(REACTION_KEYS[reaction.type])}</Text>
                </Pressable>
              ))}
            </View>

          </View>
          {!detail ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <View style={styles.replies}>
              <Text style={styles.repliesTitle}>{t('thought.repliesTitle')} ({detail.replies.length})</Text>
              {detail.replies.length === 0 ? (
                <Text style={styles.emptyReplies}>{t('thought.noReplies')}</Text>
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
                  <Text style={styles.reactionLabel}>{t(REPORT_REASON_KEYS[reason])}</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={styles.actions}>
              {isOwnThought ? (
                <Button label={t('thought.delete')} variant="destructive" onPress={onDelete} style={styles.actionButton} />
              ) : (
                <>
                  <Button variant="brand" label={t('thought.connect')} onPress={onConnect} style={styles.actionButton} />
                  <Button label={t('thought.mute')} variant="secondary" onPress={onMute} style={styles.actionButton} />
                  <Button label={t('thought.block')} variant="secondary" onPress={onBlock} style={styles.actionButton} />
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
            placeholder={t('thought.replyPlaceholder')}
            placeholderTextColor={colors.textSecondary}
            maxLength={280}
            autoFocus={autoFocusReply}
          />
          <SendButton onPress={onSendReply} disabled={sendingReply || !replyText.trim()} />
        </View>


      </View>

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
              accessibilityLabel={t('common.close')}
            />
            <View style={styles.previewCard}>
              <DreamyBackground variant="haze" />
              <Avatar name={previewAuthor.displayName} photoUrl={previewAuthor.photoUrl} size={72} />
              <Text style={styles.previewName}>{previewAuthor.displayName}</Text>
              <Button variant="brand" label={t('thought.viewProfile')} onPress={onOpenFullProfile} style={styles.previewButton} />
              <Pressable onPress={() => setPreviewAuthor(null)}>
                <Text style={styles.close}>{t('common.close')}</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}
      </ScreenContainer>
    </Modal>
  );
}

function ReplyRow({
  reply,
  isContextAuthor,
  onViewAuthor,
}: {
  reply: Reply;
  isContextAuthor: boolean;
  onViewAuthor: (authorId: string | undefined, author: AuthorIdentity | null) => void;
}) {
  const { t } = useTranslation();
  const translation = useTranslatable(() => translateReply(reply.thoughtId, reply.id));

  return (
    <View style={styles.replyItem}>
      {isContextAuthor ? (
        <Avatar name={reply.author?.displayName} photoUrl={reply.author?.photoUrl} size={38} />
      ) : (
        <Pressable onPress={() => onViewAuthor(reply.authorId, reply.author)}>
          <Avatar name={reply.author?.displayName} photoUrl={reply.author?.photoUrl} size={26} />
        </Pressable>
      )}
      <View style={styles.replyTextCol}>
        <Text style={styles.authorName}>{reply.author?.displayName ?? t('common.anonymous')}</Text>
        <View style={styles.replyTextRow}>
          <Text style={styles.reply}>{translation.text ?? reply.text}</Text>
          {!reply.isOwnReply && (
            <Pressable
              style={styles.replyTranslateIcon}
              onPress={translation.toggle}
              disabled={translation.loading}
              accessibilityLabel={
                translation.loading
                  ? t('common.translating')
                  : translation.showingTranslation
                    ? t('common.showOriginal')
                    : t('common.translate')
              }
            >
              <MaterialIcons name="translate" size={14} color="#234A74" />
            </Pressable>
          )}
        </View>
        {translation.error && <Text style={styles.actionMessage}>{translation.error}</Text>}
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
  card: { flex: 1, paddingHorizontal: 14, paddingBottom: 8, gap: 8 },
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
    lineHeight: 26,
  },
  thoughtPanel: {
    gap: spacing.md,
    boxShadow: '0px 3px 10px rgba(35,42,68,0.08)',
    backgroundColor: 'rgba(255,252,250,0.85)',
    borderRadius: 26, borderWidth: 1, borderColor: 'rgba(255,255,255,0.88)',
    padding: spacing.md,
  },
  back: { width: 44, height: 44, justifyContent: 'center' },
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
    paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  engagement: { fontSize: 13, color: colors.textPrimary, fontWeight: '600' },
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
  repliesTitle: { fontSize: 18, fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.sm },
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
    flexShrink: 1,
    fontFamily: typography.fontFamily,
    fontSize: typography.size.sm,
    color: colors.textPrimary,
    paddingTop: 4,
  },
  translateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  translateLink: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: '#234A74',
  },
  replyTextRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  replyTranslateIcon: {
    paddingBottom: 2,
  },
  replyRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  replyInput: {
    flex: 1,
    minHeight: 44,
    backgroundColor: '#FFFCFA',
    borderRadius: radius.pill,
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
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: 28,
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
