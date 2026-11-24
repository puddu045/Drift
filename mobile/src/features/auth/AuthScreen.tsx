import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { ScreenContainer } from '@/components/ScreenContainer';
import { TextField } from '@/components/TextField';
import { supabase } from '@/lib/supabase';
import { colors, spacing, typography } from '@/theme';

// Minimal email/password gate so the app can talk to the real API. This is
// NOT the full onboarding flow from PRODUCT_REQUIREMENTS.md (welcome copy,
// age confirmation, interests/languages, privacy preferences) — that's a
// separate, more considered piece of UX still to design and build.
export function AuthScreen() {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
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
    <ScreenContainer>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.select({ ios: 'padding', default: undefined })}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Drift</Text>
          <Text style={styles.subtitle}>Somewhere, someone feels the same.</Text>

          <View style={styles.form}>
            <TextField
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              placeholder="you@example.com"
            />
            <TextField
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
              onPress={submit}
              disabled={loading || !email || !password}
            />
            <Button
              label={mode === 'sign-in' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
              variant="ghost"
              onPress={() => {
                setError(null);
                setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in');
              }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.xxl,
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
    gap: spacing.md,
  },
  error: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.sm,
    color: colors.danger,
  },
});
