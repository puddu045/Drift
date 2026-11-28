import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';

import { Avatar } from '@/components/Avatar';
import { LanguagePickerModal } from '@/components/LanguagePickerModal';
import { ScreenContainer } from '@/components/ScreenContainer';
import { SendButton } from '@/components/SendButton';
import { useSession } from '@/features/auth/SessionProvider';
import { blockUser, unblockUser } from '@/features/blocks/api';
import { cachedInbox, preloadInbox } from '@/features/connections/preload';
import { getPublicProfile, PublicProfile } from '@/features/profile/api';
import { reportTarget } from '@/features/thoughts/api';
import { REPORT_REASONS } from '@/features/thoughts/reportReasons';
import { useTranslation } from '@/i18n';
import { ApiError } from '@/lib/api';
import { confirmAction } from '@/lib/confirm';
import { useTranslatable } from '@/lib/useTranslatable';
import { colors, spacing, typography } from '@/theme';

import { listMessages, markConversationRead, Message, sendMessage, translateMessage } from './api';

export function ChatScreen({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { session } = useSession();
  const userId = session?.user.id;
  const inbox = userId ? cachedInbox(userId) : undefined;
  const peerId = inbox?.connections.find(c => c.conversationId === conversationId)?.otherUserId;
  const cachedPeer = peerId ? inbox?.profiles[peerId] : undefined;
  const [resolved, setResolved] = useState<{ key: string; profile: PublicProfile }>();
  const key = userId + '/' + conversationId;
  const peer = cachedPeer ?? (resolved?.key === key ? resolved.profile : undefined);
  const otherUserId = peerId ?? null;
  const [isBlocked, setIsBlocked] = useState(
    () => inbox?.connections.find(c => c.conversationId === conversationId)?.isBlocked ?? false,
  );
  useEffect(() => {
    if (!userId || cachedPeer) return;
    let active = true;
    async function load(id: string) {
      const data = await preloadInbox(id);
      const other = data.connections.find(c => c.conversationId === conversationId)?.otherUserId
        ?? data.summaries[conversationId]?.otherUserId;
      if (!other) return;
      const profile = data.profiles[other] ?? await getPublicProfile(other);
      if (active) setResolved({ key, profile });
    }
    void load(userId).catch(() => {});
    return () => { active = false; };
  }, [userId, conversationId, cachedPeer, key]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const refresh = useCallback(() => {
    listMessages(conversationId).then((result) => setMessages(result.messages.slice().reverse()));
  }, [conversationId]);

  useFocusEffect(
    useCallback(() => {
      refresh();
      // Clears this chat's unread badge, then refreshes the cached inbox so
      // the Connections tab bar badge — and this screen's own blocked-status
      // check below — don't rely on stale data.
      markConversationRead(conversationId).catch(() => {});
      if (userId) {
        preloadInbox(userId, true)
          .then((data) => {
            setIsBlocked(data.connections.find((c) => c.conversationId === conversationId)?.isBlocked ?? false);
          })
          .catch(() => {});
      }
    }, [refresh, conversationId, userId]),
  );

  // A conversation is immersive — hide the floating tab bar from the parent
  // Tabs navigator while this screen has focus, restoring it on the way out.
  useFocusEffect(
    useCallback(() => {
      const parent = navigation.getParent();
      parent?.setOptions({ tabBarStyle: { display: 'none' } });
      return () => parent?.setOptions({ tabBarStyle: undefined });
    }, [navigation]),
  );

  const onSend = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      await sendMessage(conversationId, text.trim());
      setText('');
      refresh();
    } finally {
      setSending(false);
    }
  };

  const onReportChat = async (reason: string) => {
    if (!otherUserId) return;
    setReporting(false);
    const confirmed = await confirmAction('Report this chat?', `Reason: ${reason}. This can't be undone.`, 'Report');
    if (!confirmed) return;
    try {
      await reportTarget('profile', otherUserId, reason);
      setActionMessage('Report sent.');
    } catch (err) {
      setActionMessage(err instanceof ApiError ? err.message : 'Could not send the report.');
    }
  };

  const onBlockUser = async () => {
    if (!otherUserId) return;
    const confirmed = await confirmAction(
      'Block this user?',
      'You won’t be able to message each other until you unblock them. You can still see this conversation, and unblock them later from your profile.',
      'Block',
    );
    if (!confirmed) return;
    await blockUser(otherUserId);
    setIsBlocked(true);
    if (userId) void preloadInbox(userId, true).catch(() => {});
  };

  const onUnblockUser = async () => {
    if (!otherUserId) return;
    await unblockUser(otherUserId);
    setIsBlocked(false);
    if (userId) void preloadInbox(userId, true).catch(() => {});
  };

  return (
    <ScreenContainer background="haze">
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} accessibilityLabel={t('common.back')}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <Avatar name={peer?.displayName} photoUrl={peer?.photoUrl} size={38} />
        <Text numberOfLines={1} style={styles.peerName}>{peer?.displayName ?? t('connections.someone')}</Text>
        {otherUserId && (
          <View style={styles.headerActions}>
            <Pressable onPress={() => setReporting((v) => !v)} accessibilityLabel="Report this chat">
              <Text style={styles.headerActionLabel}>Report</Text>
            </Pressable>
            {isBlocked ? (
              <Pressable onPress={onUnblockUser} accessibilityLabel="Unblock this user">
                <Text style={styles.headerActionLabel}>Unblock</Text>
              </Pressable>
            ) : (
              <Pressable onPress={onBlockUser} accessibilityLabel="Block this user">
                <Text style={[styles.headerActionLabel, styles.headerActionDanger]}>Block</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
      {isBlocked && <Text style={styles.blockedNote}>You can’t message each other right now.</Text>}

      {reporting && (
        <View style={styles.reportReasons}>
          {REPORT_REASONS.map((reason) => (
            <Pressable key={reason} style={styles.reportReasonPill} onPress={() => onReportChat(reason)}>
              <Text style={styles.reportReasonLabel}>{reason}</Text>
            </Pressable>
          ))}
        </View>
      )}
      {actionMessage && <Text style={styles.actionMessage}>{actionMessage}</Text>}

      <FlatList
        style={styles.list}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <MessageBubble
            message={item}
            isMine={item.senderId === session?.user.id}
            conversationId={conversationId}
          />
        )}
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={isBlocked ? 'Messaging is unavailable' : 'Message...'}
          placeholderTextColor={colors.textSecondary}
          editable={!isBlocked}
        />
        <SendButton onPress={onSend} disabled={isBlocked || sending || !text.trim()} />
      </View>
    </ScreenContainer>
  );
}

function MessageBubble({
  message,
  isMine,
  conversationId,
}: {
  message: Message;
  isMine: boolean;
  conversationId: string;
}) {
  const translation = useTranslatable(() => translateMessage(conversationId, message.id));

  if (isMine) {
    return (
      <View style={[styles.bubble, styles.bubbleMine]}>
        <Text style={[styles.bubbleText, styles.myText]}>{message.text}</Text>
      </View>
    );
  }

  return (
    <View style={styles.theirsWrap}>
      <View style={styles.theirsRow}>
        <View style={[styles.bubble, styles.bubbleTheirs]}>
          <Text style={styles.bubbleText}>{translation.text ?? message.text}</Text>
        </View>
        <Pressable
          style={styles.translateIconButton}
          onPress={translation.toggle}
          disabled={translation.loading}
          accessibilityLabel={
            translation.loading
              ? 'Translating…'
              : translation.showingTranslation
                ? 'Show original'
                : 'Translate'
          }
        >
          {translation.loading ? (
            <ActivityIndicator size="small" color={colors.textSecondary} />
          ) : (
            <MaterialIcons name="translate" size={16} color="#234A74" />
          )}
        </Pressable>
      </View>
      {translation.error && <Text style={styles.translateError}>{translation.error}</Text>}

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    minHeight: 56,
  },
  peerName: { flex: 1, fontSize: typography.size.md, color: colors.textPrimary, fontWeight: '600' },
  back: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  headerActionLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.textSecondary,
  },
  headerActionDanger: {
    color: colors.danger,
  },
  reportReasons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  reportReasonPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  reportReasonLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
  },
  blockedNote: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.xs,
    color: colors.danger,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  actionMessage: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
  },
  bubbleMine: {
    alignSelf: 'flex-end',
    backgroundColor: '#354E76',
    borderBottomRightRadius: 6,
  },
  bubbleTheirs: {
    marginBottom: 0,
    backgroundColor: '#FFFCFA',
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.7)',
  },
  myText: { color: 'white' },
  bubbleText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.md,
    color: colors.textPrimary,
  },
  theirsWrap: {
    alignSelf: 'flex-start',
    marginBottom: spacing.xs,
  },
  theirsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  translateIconButton: {
    padding: 4,
  },
  translateError: {
    fontFamily: typography.fontFamily,
    fontSize: 10,
    color: colors.danger,
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    minHeight: 44,
    backgroundColor: '#FFFCFA',
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(21, 33, 59, 0.3)',
    paddingHorizontal: spacing.md,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontSize: typography.size.md,
  },
});
