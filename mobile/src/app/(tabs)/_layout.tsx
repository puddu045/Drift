import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { ColorValue, View } from 'react-native';

import { TopRightBar } from '@/components/TopRightBar';
import { colors, spacing, typography } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;
type TabIconProps = { focused: boolean; color: ColorValue; size: number };

function TabIcon({ name, color, size }: { name: IconName } & TabIconProps) {
  return <Ionicons name={name} color={color as string} size={size} />;
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
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            shadowColor: colors.textPrimary,
            shadowOpacity: 0.12,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 6 },
            elevation: 8,
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
          options={{ title: 'Create', tabBarIcon: tabIcon('add-circle-outline', 'add-circle') }}
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
