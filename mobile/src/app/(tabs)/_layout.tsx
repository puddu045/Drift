import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { ColorValue, View } from 'react-native';

import { TopRightBar } from '@/components/TopRightBar';
import { colors, typography } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;
type TabIconProps = { focused: boolean; color: ColorValue; size: number };

function TabIcon({ name, color, size }: { name: IconName } & TabIconProps) {
  return <Ionicons name={name} color={color as string} size={size} />;
}

// Standard React Navigation tabBarIcon pattern — TabIcon above already has
// its own display name, so this wrapper closure doesn't need one.
function tabIcon(name: IconName) {
  // eslint-disable-next-line react/display-name
  return (props: TabIconProps) => <TabIcon name={name} {...props} />;
}

export default function TabLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
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
        <Tabs.Screen name="index" options={{ title: 'Universe', tabBarIcon: tabIcon('planet-outline') }} />
        <Tabs.Screen name="mine" options={{ title: 'Mine', tabBarIcon: tabIcon('albums-outline') }} />
        <Tabs.Screen name="destiny" options={{ title: 'Destiny', tabBarIcon: tabIcon('star-outline') }} />
        <Tabs.Screen
          name="create"
          options={{ title: 'Create', tabBarIcon: tabIcon('add-circle-outline') }}
        />
        <Tabs.Screen
          name="connections"
          options={{ title: 'Connections', tabBarIcon: tabIcon('people-outline') }}
        />
      </Tabs>
      <TopRightBar />
    </View>
  );
}
