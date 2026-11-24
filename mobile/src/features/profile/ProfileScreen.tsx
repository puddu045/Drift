import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { ScreenContainer } from '@/components/ScreenContainer';
import { TextField } from '@/components/TextField';
import { useSession } from '@/features/auth/SessionProvider';
import { getOwnProfile, updatePreferences, upsertOwnProfile } from '@/features/profile/api';
import { supabase } from '@/lib/supabase';
import { ApiError } from '@/lib/api';
import { colors, spacing, typography } from '@/theme';

export function ProfileScreen() {
  const router = useRouter();
  const { session } = useSession();
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [showIdentity, setShowIdentity] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getOwnProfile()
      .then((profile) => {
        setDisplayName(profile.displayName);
        setUsername(profile.username);
        setBio(profile.bio ?? '');
        setPhotoUrl(profile.photoUrl);
        setShowIdentity(profile.showIdentityOnContent);
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
      await upsertOwnProfile({
        displayName: displayName.trim(),
        username: username.trim(),
        bio: bio.trim() || undefined,
        photoUrl: photoUrl ?? undefined,
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  };

  const onToggleIdentity = async (value: boolean) => {
    setShowIdentity(value);
    await updatePreferences({ showIdentityOnContent: value });
  };

  const onPickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo library access is needed to pick a profile photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.6,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !session) return;

    setUploadingPhoto(true);
    setError(null);
    try {
      const asset = result.assets[0];
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const path = `${session.user.id}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: true });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      // Cache-bust so the new photo shows immediately instead of a stale CDN copy.
      setPhotoUrl(`${data.publicUrl}?t=${Date.now()}`);
    } catch {
      setError('Could not upload photo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (loading) return <ScreenContainer />;

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.subtitle}>{session?.user.email}</Text>

        <Pressable onPress={onPickPhoto} style={styles.photoRow} disabled={uploadingPhoto}>
          <Avatar name={displayName} photoUrl={photoUrl} size={72} />
          <Text style={styles.photoLabel}>{uploadingPhoto ? 'Uploading...' : 'Change photo'}</Text>
        </Pressable>

        <TextField label="Display name" value={displayName} onChangeText={setDisplayName} maxLength={60} />
        <TextField
          label="Username"
          value={username}
          onChangeText={(value) => setUsername(value.toLowerCase())}
          autoCapitalize="none"
          maxLength={24}
        />
        <TextField label="Bio" value={bio} onChangeText={setBio} multiline maxLength={280} />

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Show my name/photo on my public thoughts and replies</Text>
          <Switch value={showIdentity} onValueChange={onToggleIdentity} />
        </View>

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
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  photoLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.sm,
    color: colors.accent,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  toggleLabel: {
    flex: 1,
    fontFamily: typography.fontFamily,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
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
