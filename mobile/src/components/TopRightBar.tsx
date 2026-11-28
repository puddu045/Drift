import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { listNotifications } from '@/features/notifications/api';
import { getOwnProfile } from '@/features/profile/api';
import { colors, spacing } from '@/theme';


// Floats above every tab screen so Notifications and Profile stay reachable
// from anywhere, instead of taking up a tab of their own.
export function TopRightBar() {
  const router = useRouter();
  const darkBackdrop = usePathname() === '/destiny';
  const insets = useSafeAreaInsets();
  const [unread, setUnread] = useState(0);
  const [profile, setProfile] = useState<{ displayName: string; photoUrl: string | null } | null>(null);

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
      getOwnProfile()
        .then((p) => {
          if (!cancelled) setProfile({ displayName: p.displayName, photoUrl: p.photoUrl });
        })
        .catch(() => {
          // No profile yet (first-run setup not completed) — keep the
          // default placeholder, same as Avatar does everywhere else.
        });
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
        <Ionicons name="notifications-outline" size={24} color={darkBackdrop ? 'white' : colors.textPrimary} />
        {unread > 0 && <View style={styles.badge} />}
      </Pressable>
      <Pressable onPress={() => router.push('/profile')} accessibilityLabel="Profile" style={styles.iconButton}>
        <Avatar name={profile?.displayName} photoUrl={profile?.photoUrl} size={36} />
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
    width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
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
