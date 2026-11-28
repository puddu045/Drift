import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';

import { Button } from '@/components/Button';
import { LanguagePickerModal } from '@/components/LanguagePickerModal';
import { ScreenContainer } from '@/components/ScreenContainer';
import { blockUser } from '@/features/blocks/api';
import { useSession } from '@/features/auth/SessionProvider';
import { reportTarget } from '@/features/thoughts/api';
import { REPORT_REASONS } from '@/features/thoughts/reportReasons';
import { ApiError } from '@/lib/api';
import { useTranslatable } from '@/lib/useTranslatable';
import { colors, spacing, typography } from '@/theme';

import { listConversations, listMessages, Message, sendMessage, translateMessage } from './api';

export function ChatScreen({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const navigation = useNavigation();
  const { session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const [reporting, setReporting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const refresh = useCallback(() => {
    listMessages(conversationId).then((result) => setMessages(result.messages.slice().reverse()));
  }, [conversationId]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  useEffect(() => {
    listConversations()
      .then((list) => {
        const match = list.find((c) => c.conversationId === conversationId);
        setOtherUserId(match?.otherUserId ?? null);
      })
      .catch(() => {});
  }, [conversationId]);

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
    try {
      await reportTarget('profile', otherUserId, reason);
      setActionMessage('Report sent.');
    } catch (err) {
      setActionMessage(err instanceof ApiError ? err.message : 'Could not send the report.');
    } finally {
      setReporting(false);
    }
  };

  const onBlockUser = async () => {
    if (!otherUserId) return;
    await blockUser(otherUserId);
    router.back();
  };

  return (
    <ScreenContainer floatingTabBar>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} accessibilityLabel="Back">
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        {otherUserId && (
          <View style={styles.headerActions}>
            <Pressable onPress={() => setReporting((v) => !v)} accessibilityLabel="Report this chat">
              <Text style={styles.headerActionLabel}>Report</Text>
            </Pressable>
            <Pressable onPress={onBlockUser} accessibilityLabel="Block this user">
              <Text style={[styles.headerActionLabel, styles.headerActionDanger]}>Block</Text>
            </Pressable>
          </View>
        )}
      </View>

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
          placeholder="Message..."
          placeholderTextColor={colors.textSecondary}
        />
        <Button label="Send" onPress={onSend} disabled={sending || !text.trim()} />
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

  return (
    <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
      <Text style={styles.bubbleText}>{translation.text ?? message.text}</Text>
      <Pressable onPress={translation.toggle} disabled={translation.loading}>
        <Text style={styles.translateLink}>
          {translation.loading
            ? 'Translating…'
            : translation.showingTranslation
              ? 'Show original'
              : 'Translate'}
        </Text>
      </Pressable>
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    // Leave enough headroom to clear the notification/profile icons, which
    // float above every tab screen (TopRightBar) and aren't part of this
    // screen's own layout, so they don't reserve space automatically.
    minHeight: 56,
  },
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
    backgroundColor: `${colors.accent}80`,
    borderWidth: 1,
    borderColor: `${colors.accent}b0`,
  },
  bubbleTheirs: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.7)',
  },
  bubbleText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.md,
    color: colors.textPrimary,
  },
  translateLink: {
    fontFamily: typography.fontFamily,
    fontSize: 10,
    fontWeight: typography.weight.semibold,
    color: '#234A74',
    marginTop: 2,
  },
  translateError: {
    fontFamily: typography.fontFamily,
    fontSize: 10,
    color: colors.danger,
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.lg,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    minHeight: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(21, 33, 59, 0.3)',
    paddingHorizontal: spacing.md,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontSize: typography.size.md,
  },
});
