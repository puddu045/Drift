import { Tabs } from 'expo-router';

import { colors, typography } from '@/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // No icon set yet (see DESIGN_SYSTEM.md — minimal nav, text-only tabs
        // for now); without this, the default tab bar tries to render a
        // built-in icon and shows a broken glyph box instead.
        tabBarIcon: () => null,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {
          fontFamily: typography.fontFamily,
          fontSize: typography.size.xs,
          fontWeight: typography.weight.medium,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Universe' }} />
      <Tabs.Screen name="destiny" options={{ title: 'Destiny' }} />
      <Tabs.Screen name="create" options={{ title: 'Create' }} />
      <Tabs.Screen name="connections" options={{ title: 'Connections' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
