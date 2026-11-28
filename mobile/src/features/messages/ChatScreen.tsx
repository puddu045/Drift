import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';

import { SendButton } from '@/components/SendButton';
import { Avatar } from '@/components/Avatar';
import { cachedInbox, preloadInbox } from '@/features/connections/preload';
import { getPublicProfile, PublicProfile } from '@/features/profile/api';
import { useTranslation } from '@/i18n';
import { ScreenContainer } from '@/components/ScreenContainer';
import { useSession } from '@/features/auth/SessionProvider';
import { colors, spacing, typography } from '@/theme';

import { listMessages, Message, sendMessage } from './api';

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

  const refresh = useCallback(() => {
    listMessages(conversationId).then((result) => setMessages(result.messages.slice().reverse()));
  }, [conversationId]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
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

  return (
    <ScreenContainer background="haze">
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} accessibilityLabel={t('common.back')}>
          <Text style={styles.back}>‹ {t('common.back')}</Text>
        </Pressable>
        <Avatar name={peer?.displayName} photoUrl={peer?.photoUrl} size={38} />
        <Text numberOfLines={1} style={styles.peerName}>{peer?.displayName ?? t('connections.someone')}</Text>
      </View>

      <FlatList
        style={styles.list}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const isMine = item.senderId === session?.user.id;
          return (
            <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
              <Text style={[styles.bubbleText, isMine && styles.myText]}>{item.text}</Text>
            </View>
          );
        }}
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Message..."
          placeholderTextColor={colors.textSecondary}
        />
        <SendButton onPress={onSend} disabled={sending || !text.trim()} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 56,
  },
  peerName: { flex: 1, fontSize: typography.size.md, color: colors.textPrimary, fontWeight: '600' },
  back: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
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
    alignSelf: 'flex-start',
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
