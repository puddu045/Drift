import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Card } from '@/components/Card';
import { ScreenContainer } from '@/components/ScreenContainer';
import { colors, spacing, typography } from '@/theme';

import { listNotifications, markNotificationRead, Notification } from './api';

const LABELS: Record<Notification['type'], string> = {
  reaction: 'Someone reacted to your thought',
  reply: 'Someone replied to your thought',
  connection_request: 'You have a new connection request',
  connection_accepted: 'Your connection request was accepted',
  message: 'You have a new message',
  destiny_ready: 'Your daily Destiny thought is ready',
};

export function NotificationsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Notification[]>([]);

  useEffect(() => {
    listNotifications().then(setItems);
  }, []);

  const onPress = async (item: Notification) => {
    if (!item.readAt) {
      await markNotificationRead(item.id);
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, readAt: new Date().toISOString() } : n)));
    }
  };

  return (
    <ScreenContainer>
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
              <Text style={styles.label}>{LABELS[item.type]}</Text>
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
    color: colors.accent,
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
  card: {
    marginBottom: spacing.sm,
  },
  unread: {
    borderColor: colors.accent,
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
