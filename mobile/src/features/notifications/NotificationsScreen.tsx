import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Card } from '@/components/Card';
import { ScreenContainer } from '@/components/ScreenContainer';
import { colors, spacing, typography } from '@/theme';

import { listNotifications, markNotificationsRead, Notification } from './api';

// Only these types show in the tray — chat messages have their own badge on
// the Connections tab instead (see (tabs)/_layout.tsx) and would otherwise
// double up as both a tray item and a chat badge.
const TRAY_TYPES: Notification['type'][] = [
  'reaction',
  'reply',
  'connection_request',
  'connection_accepted',
  'destiny_ready',
];

function labelFor(item: Notification): string {
  if (item.type === 'reaction') {
    const who = item.lastActorName ?? 'Someone';
    return item.extraCount > 0 ? `${who} and others reacted to your thought` : `${who} reacted to your thought`;
  }
  if (item.type === 'reply') {
    const who = item.lastActorName ?? 'Someone';
    return item.extraCount > 0 ? `${who} and others replied to your thought` : `${who} replied to your thought`;
  }
  if (item.type === 'connection_request') return 'You have a new connection request';
  if (item.type === 'connection_accepted') return 'Your connection request was accepted';
  return 'Your daily Destiny thought is ready';
}

const icons: Record<Notification['type'], keyof typeof Ionicons.glyphMap> = {
  reaction: 'heart-outline', reply: 'chatbubble-outline', message: 'mail-outline',
  connection_request: 'person-add-outline', connection_accepted: 'people-outline', destiny_ready: 'star-outline',
};

export function NotificationsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Notification[]>([]);

  useEffect(() => {
    listNotifications().then((all) => setItems(all.filter((n) => TRAY_TYPES.includes(n.type))));
  }, []);

  const onPress = async (item: Notification) => {
    if (!item.readAt) {
      await markNotificationsRead(item.groupIds);
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, readAt: new Date().toISOString() } : n)));
    }

    if (item.type === 'reaction' || item.type === 'reply') {
      const thoughtId = item.payload.thoughtId;
      if (typeof thoughtId === 'string') {
        router.push({ pathname: '/thoughts/[thoughtId]', params: { thoughtId } });
      }
      return;
    }
    if (item.type === 'connection_request') {
      router.push({ pathname: '/(tabs)/connections', params: { segment: 'Requests' } });
      return;
    }
    if (item.type === 'connection_accepted') {
      const conversationId = item.payload.conversationId;
      if (typeof conversationId === 'string') {
        router.push({ pathname: '/(tabs)/connections/[conversationId]', params: { conversationId } });
      } else {
        router.push({ pathname: '/(tabs)/connections', params: { segment: 'Chats' } });
      }
      return;
    }
    if (item.type === 'destiny_ready') {
      router.push('/(tabs)/destiny');
    }
  };

  return (
    <ScreenContainer background="haze">
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} accessibilityLabel="Back">
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>Notifications</Text>
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>Nothing yet.</Text>}
        renderItem={({ item }) => (
          <Pressable onPress={() => onPress(item)}>
            <Card style={[styles.card, !item.readAt && styles.unread]}>
              <View style={styles.icon}><Ionicons name={icons[item.type]} size={21} color="#30496D" /></View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={styles.label}>{labelFor(item)}</Text>
                <Text style={styles.time}>{new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</Text>
              </View>
              {!item.readAt && <View accessibilityLabel="Unread" style={styles.dot} />}
            </Card>
          </Pressable>
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.xs,
  },
  back: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.md,
    color: '#28466B',
  },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  list: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  icon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EFEDF5', alignItems: 'center', justifyContent: 'center' },
  time: { color: colors.textSecondary, fontSize: 12 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#355981' },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFCFA',
    marginBottom: spacing.sm,
  },
  unread: {
    borderColor: '#D6DEE9',
  },
  label: {
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
