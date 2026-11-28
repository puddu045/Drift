import { UnwrittenWordmark } from '@/components/UnwrittenWordmark';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { ScreenContainer } from '@/components/ScreenContainer';
import { TextField } from '@/components/TextField';
import { supabase } from '@/lib/supabase';
import { colors, spacing, typography } from '@/theme';

type Props = {
  /** Which form to show first — set by which button WelcomeScreen was
   * dismissed with ('Get Started' → sign-up, 'I already have an account' →
   * sign-in). Still freely toggleable from here either way. */
  initialMode?: 'sign-in' | 'sign-up';
  /** Returns to WelcomeScreen, when this screen was reached through it. */
  onBack?: () => void;
};

// Minimal email/password gate so the app can talk to the real API. This is
// NOT the full onboarding flow from PRODUCT_REQUIREMENTS.md (age
// confirmation, interests/languages, privacy preferences) — that's a
// separate, more considered piece of UX still to design and build. The
// welcome copy/CTA part of onboarding now lives in WelcomeScreen.tsx.
export function AuthScreen({ initialMode = 'sign-in', onBack }: Props) {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setLoading(true);
    const { error: authError } =
      mode === 'sign-in'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (authError) setError(authError.message);
  };

  return (
    <ScreenContainer background="evening">
      {onBack && (
        <Pressable onPress={onBack} accessibilityLabel="Back" style={styles.back}>
          <Text style={styles.backLabel}>‹ Back</Text>
        </Pressable>
      )}
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <View style={{ alignItems: 'center' }}><UnwrittenWordmark size={54} /></View>
        

        <View style={styles.form}>
          <View pointerEvents="none" style={styles.cardSurface} />
          <Text style={styles.title}>{mode === 'sign-in' ? 'Welcome back' : 'Create an account'}</Text>
          <TextField
            style={styles.input}
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            placeholder="you@example.com"
          />
          <TextField
            style={styles.input}
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            placeholder="••••••••"
          />
          {error && <Text style={styles.error}>{error}</Text>}
          <Button
            label={mode === 'sign-in' ? 'Sign in' : 'Create account'}
            variant="brand"
            onPress={submit}
            disabled={loading || !email || !password}
          />
          <Button
            label={mode === 'sign-in' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            variant="secondary"
            onPress={() => {
              setError(null);
              setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in');
            }}
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  back: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  backLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
  },
  content: {
    flexGrow: 1,
    paddingVertical: spacing.lg,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: 24,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  form: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    padding: 22,
    gap: spacing.md,
  },
  cardSurface: {
    ...StyleSheet.absoluteFill,
    borderRadius: 24,
    backgroundColor: 'rgba(255,252,250,0.75)',
    boxShadow: '0px 4px 12px rgba(35,49,74,0.10)',
  },
  input: { backgroundColor: '#FFFCFA' },
  error: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.sm,
    color: colors.danger,
  },
});
