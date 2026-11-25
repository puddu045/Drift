import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { listNotifications } from '@/features/notifications/api';
import { colors, spacing } from '@/theme';

// Floats above every tab screen so Notifications and Profile stay reachable
// from anywhere, instead of taking up a tab of their own.
export function TopRightBar() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [unread, setUnread] = useState(0);

  // Refetches whenever the tabs regain focus — e.g. coming back from
  // Notifications or Profile, both pushed on top of this navigator.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      listNotifications()
        .then((items) => {
          if (!cancelled) setUnread(items.filter((n) => !n.readAt).length);
        })
        .catch(() => {});
      return () => {
        cancelled = true;
      };
    }, []),
  );

  return (
    <View style={[styles.bar, { top: insets.top + spacing.xs }]}>
      <Pressable
        onPress={() => router.push('/notifications')}
        accessibilityLabel={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        style={styles.iconButton}
      >
        <Ionicons name="notifications-outline" size={22} color={colors.textPrimary} />
        {unread > 0 && <View style={styles.badge} />}
      </Pressable>
      <Pressable onPress={() => router.push('/profile')} accessibilityLabel="Profile" style={styles.iconButton}>
        <Ionicons name="person-circle-outline" size={24} color={colors.textPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    right: spacing.lg,
    flexDirection: 'row',
    gap: spacing.sm,
    zIndex: 10,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: colors.textPrimary,
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.danger,
    borderWidth: 1,
    borderColor: colors.surface,
  },
});
