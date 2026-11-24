import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '@/components/Button';
import { ScreenContainer } from '@/components/ScreenContainer';
import { TextField } from '@/components/TextField';
import { useSession } from '@/features/auth/SessionProvider';
import { getOwnProfile, upsertOwnProfile } from '@/features/profile/api';
import { supabase } from '@/lib/supabase';
import { ApiError } from '@/lib/api';
import { colors, spacing, typography } from '@/theme';

export function ProfileScreen() {
  const router = useRouter();
  const { session } = useSession();
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getOwnProfile()
      .then((profile) => {
        setDisplayName(profile.displayName);
        setUsername(profile.username);
        setBio(profile.bio ?? '');
      })
      .catch(() => {
        // No profile yet — that's expected for a brand-new account.
      })
      .finally(() => setLoading(false));
  }, []);

  const onSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await upsertOwnProfile({ displayName: displayName.trim(), username: username.trim(), bio: bio.trim() || undefined });
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <ScreenContainer />;

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.subtitle}>{session?.user.email}</Text>

        <TextField label="Display name" value={displayName} onChangeText={setDisplayName} maxLength={60} />
        <TextField
          label="Username"
          value={username}
          onChangeText={(value) => setUsername(value.toLowerCase())}
          autoCapitalize="none"
          maxLength={24}
        />
        <TextField label="Bio" value={bio} onChangeText={setBio} multiline maxLength={280} />

        {error && <Text style={styles.error}>{error}</Text>}
        {saved && <Text style={styles.saved}>Saved.</Text>}

        <Button
          label="Save"
          onPress={onSave}
          disabled={saving || !displayName.trim() || !username.trim()}
        />
        <Button label="Notifications" variant="ghost" onPress={() => router.push('/notifications')} />
        <Button label="Sign out" variant="ghost" onPress={() => supabase.auth.signOut()} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  subtitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  error: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.sm,
    color: colors.danger,
  },
  saved: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.sm,
    color: colors.accent,
  },
});
