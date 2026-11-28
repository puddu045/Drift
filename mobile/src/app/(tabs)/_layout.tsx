import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { ColorValue, StyleSheet, View } from 'react-native';

import { TopRightBar } from '@/components/TopRightBar';
import { colors, palette, spacing, typography } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;
type TabIconProps = { focused: boolean; color: ColorValue; size: number };

// The accent color (a light peach) nearly vanishes against this screen's own
// peach/pink sky background — icons and labels stay navy (colors.textPrimary)
// for guaranteed contrast regardless of what's behind them, and the selected
// tab gets a soft accent-colored circle behind its icon instead, which reads
// fine even at low opacity since it's contrast against the icon, not text
// against a busy photo.
function TabIcon({ name, size, focused }: { name: IconName } & TabIconProps) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Ionicons name={name} color={colors.textPrimary} size={size} />
    </View>
  );
}

// Standard React Navigation tabBarIcon pattern — TabIcon above already has
// its own display name, so this wrapper closure doesn't need one. Swaps to
// the filled glyph when focused, same idea as a selected-state color swap.
function tabIcon(outlineName: IconName, filledName: IconName) {
  // eslint-disable-next-line react/display-name
  return (props: TabIconProps) => <TabIcon name={props.focused ? filledName : outlineName} {...props} />;
}

export default function TabLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            position: 'absolute',
            left: spacing.md,
            right: spacing.md,
            bottom: spacing.md,
            height: 64,
            borderRadius: 28,
            borderTopWidth: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            shadowColor: colors.textPrimary,
            shadowOpacity: 0.08,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
            elevation: 4,
          },
          tabBarActiveTintColor: colors.textPrimary,
          tabBarInactiveTintColor: colors.textPrimary,
          tabBarLabelStyle: {
            fontFamily: typography.fontFamily,
            fontSize: typography.size.xs,
            fontWeight: typography.weight.medium,
            textShadowColor: 'rgba(255, 255, 255, 0.8)',
            textShadowRadius: 3,
            textShadowOffset: { width: 0, height: 0 },
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{ title: 'Universe', tabBarIcon: tabIcon('planet-outline', 'planet') }}
        />
        <Tabs.Screen
          name="destiny"
          options={{ title: 'Destiny', tabBarIcon: tabIcon('star-outline', 'star') }}
        />
        <Tabs.Screen
          name="create"
          options={{ title: 'Create', tabBarStyle: { display: 'none' }, tabBarIcon: tabIcon('add-circle-outline', 'add-circle') }}
        />
        <Tabs.Screen
          name="connections"
          options={{ title: 'Connections', tabBarIcon: tabIcon('people-outline', 'people') }}
        />
      </Tabs>
      <TopRightBar />
    </View>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: `${palette.paleSky}CC`,
  },
});
