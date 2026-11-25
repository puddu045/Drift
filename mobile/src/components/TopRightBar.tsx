import { useCallback, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { listNotifications } from '@/features/notifications/api';
import { getOwnProfile } from '@/features/profile/api';
import { colors, spacing } from '@/theme';

// Same glass-bubble texture the thought bubbles use, for a consistent
// "bubble" look on these two buttons too.
const GLASS_TEXTURE = require('../../assets/bubble-glass-2.webp');

// Floats above every tab screen so Notifications and Profile stay reachable
// from anywhere, instead of taking up a tab of their own.
export function TopRightBar() {
  const router = useRouter();
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
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.8)', `${colors.accent}40`]}
          start={{ x: 0.15, y: 0.1 }}
          end={{ x: 0.9, y: 0.95 }}
          style={StyleSheet.absoluteFill}
        />
        <Image source={GLASS_TEXTURE} resizeMode="cover" style={StyleSheet.absoluteFill} />
        <Ionicons name="notifications-outline" size={20} color={colors.textPrimary} />
        {unread > 0 && <View style={styles.badge} />}
      </Pressable>
      <Pressable onPress={() => router.push('/profile')} accessibilityLabel="Profile" style={styles.iconButton}>
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.8)', `${colors.accent}40`]}
          start={{ x: 0.15, y: 0.1 }}
          end={{ x: 0.9, y: 0.95 }}
          style={StyleSheet.absoluteFill}
        />
        <Image source={GLASS_TEXTURE} resizeMode="cover" style={StyleSheet.absoluteFill} />
        <Avatar name={profile?.displayName} photoUrl={profile?.photoUrl} size={30} />
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
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
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
