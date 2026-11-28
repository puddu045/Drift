import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OnboardingCarousel } from '@/features/auth/OnboardingCarousel';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ScreenContainer } from '@/components/ScreenContainer';
import { AuthScreen } from '@/features/auth/AuthScreen';
import { SessionProvider, useSession } from '@/features/auth/SessionProvider';
import { WelcomeScreen } from '@/features/auth/WelcomeScreen';
import { usePushRegistration } from '@/features/notifications/usePushRegistration';
import { LocaleProvider } from '@/i18n';
import { usePrefetchTabs } from '@/lib/usePrefetchTabs';
import { colors } from '@/theme';

function RootNavigator() {
  const { session, loading } = useSession();
  usePushRegistration(!!session);
  usePrefetchTabs(session?.user.id);

  // Pre-auth flow: Welcome (sunset background, picks a mode) → AuthScreen
  // (the actual sign-in/sign-up form). Not an Expo Router route of its own
  // since there's nothing to deep-link to before a session exists.
  const [authStep, setAuthStep] = useState<'welcome' | 'tour' | 'form'>('welcome');
  const [tourSeen, setTourSeen] = useState<boolean | null>(null);
  useEffect(() => {
    AsyncStorage.getItem('unwritten.onboarding.v1').then(value => setTourSeen(value === 'done')).catch(() => setTourSeen(false));
  }, []);
  const [formMode, setFormMode] = useState<'sign-in' | 'sign-up'>('sign-in');

  if (loading) return <ScreenContainer />;
  if (!session) {
    if (tourSeen === null) return <ScreenContainer />;
    if (authStep === 'tour') return <OnboardingCarousel onFinish={() => {
      setTourSeen(true);
      void AsyncStorage.setItem('unwritten.onboarding.v1', 'done').catch(() => {});
      setAuthStep('form');
    }} />;
    if (authStep === 'welcome') {
      return (
        <WelcomeScreen
          onGetStarted={() => {
            setFormMode('sign-up');
            setAuthStep(tourSeen ? 'form' : 'tour');
          }}
          onSignIn={() => {
            setFormMode('sign-in');
            setAuthStep('form');
          }}
        />
      );
    }
    return <AuthScreen initialMode={formMode} onBack={() => setAuthStep('welcome')} />;
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="profiles/[userId]" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <SessionProvider>
          <LocaleProvider>
            <RootNavigator />
          </LocaleProvider>
        </SessionProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
