import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ScreenContainer } from '@/components/ScreenContainer';
import { AuthScreen } from '@/features/auth/AuthScreen';
import { SessionProvider, useSession } from '@/features/auth/SessionProvider';
import { colors } from '@/theme';

function RootNavigator() {
  const { session, loading } = useSession();

  if (loading) return <ScreenContainer />;
  if (!session) return <AuthScreen />;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <SessionProvider>
          <RootNavigator />
        </SessionProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
