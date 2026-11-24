import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { EditFieldModal } from '@/components/EditFieldModal';
import { ScreenContainer } from '@/components/ScreenContainer';
import { TextField } from '@/components/TextField';
import { useSession } from '@/features/auth/SessionProvider';
import { getOwnProfile, updatePreferences, upsertOwnProfile } from '@/features/profile/api';
import { supabase } from '@/lib/supabase';
import { ApiError } from '@/lib/api';
import { colors, radius, spacing, typography } from '@/theme';

type FieldKey = 'displayName' | 'username' | 'bio' | null;

const FIELD_CONFIG: Record<
  Exclude<FieldKey, null>,
  {
    label: string;
    maxLength: number;
    multiline?: boolean;
    autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
    hint?: string;
  }
> = {
  displayName: { label: 'Display name', maxLength: 60 },
  username: {
    label: 'Username',
    maxLength: 24,
    autoCapitalize: 'none',
    hint: 'Lowercase letters, numbers and underscores only.',
  },
  bio: { label: 'Bio', maxLength: 280, multiline: true },
};

function describeError(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

export function ProfileScreen() {
  const router = useRouter();
  const { session } = useSession();
  const [hasProfile, setHasProfile] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [showIdentity, setShowIdentity] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<FieldKey>(null);

  // First-time setup fields — a profile can't be created without these two.
  const [setupName, setSetupName] = useState('');
  const [setupUsername, setSetupUsername] = useState('');
  const [settingUp, setSettingUp] = useState(false);

  useEffect(() => {
    getOwnProfile()
      .then((profile) => {
        setHasProfile(true);
        setDisplayName(profile.displayName);
        setUsername(profile.username);
        setBio(profile.bio ?? '');
        setPhotoUrl(profile.photoUrl);
        setShowIdentity(profile.showIdentityOnContent);
      })
      .catch(() => {
        // No profile yet — expected for a brand-new account, handled by the
        // setup card below rather than treated as an error.
      })
      .finally(() => setLoading(false));
  }, []);

  const onCreateProfile = async () => {
    if (!setupName.trim() || !setupUsername.trim()) return;
    setSettingUp(true);
    setError(null);
    try {
      const profile = await upsertOwnProfile({
        displayName: setupName.trim(),
        username: setupUsername.trim().toLowerCase(),
      });
      setHasProfile(true);
      setDisplayName(profile.displayName);
      setUsername(profile.username);
      setBio(profile.bio ?? '');
      setPhotoUrl(profile.photoUrl);
    } catch (err) {
      setError(describeError(err, 'Could not create your profile.'));
    } finally {
      setSettingUp(false);
    }
  };

  const save = async (next: { displayName: string; username: string; bio: string }) => {
    setError(null);
    try {
      await upsertOwnProfile({
        displayName: next.displayName,
        username: next.username.toLowerCase(),
        bio: next.bio || undefined,
        photoUrl: photoUrl ?? undefined,
      });
    } catch (err) {
      setError(describeError(err, 'Could not save your profile.'));
    }
  };

  const onSaveField = async (value: string) => {
    const next = {
      displayName: editing === 'displayName' ? value : displayName,
      username: editing === 'username' ? value : username,
      bio: editing === 'bio' ? value : bio,
    };
    setDisplayName(next.displayName);
    setUsername(next.username.toLowerCase());
    setBio(next.bio);
    setEditing(null);
    await save(next);
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
      base64: true,
    });
    if (result.canceled || !session) return;

    const asset = result.assets[0];
    if (!asset.base64) {
      setError('Could not read the selected photo.');
      return;
    }

    setUploadingPhoto(true);
    setError(null);
    const path = `${session.user.id}/avatar.jpg`;
    let newPhotoUrl: string;
    try {
      // React Native's Blob/File/FormData don't work reliably with Supabase
      // Storage uploads — this needs an ArrayBuffer from base64 data instead.
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, decode(asset.base64), { contentType: 'image/jpeg', upsert: true });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      newPhotoUrl = `${data.publicUrl}?t=${Date.now()}`;
    } catch {
      setError('Could not upload photo.');
      setUploadingPhoto(false);
      return;
    }

    setPhotoUrl(newPhotoUrl);
    try {
      await upsertOwnProfile({ displayName, username, bio: bio || undefined, photoUrl: newPhotoUrl });
    } catch (err) {
      setError(describeError(err, 'Photo uploaded, but could not save it to your profile.'));
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (loading) return <ScreenContainer />;

  if (!hasProfile) {
    return (
      <ScreenContainer>
        <View style={styles.content}>
          <Text style={styles.title}>Set up your profile</Text>
          <Text style={styles.subtitle}>
            Pick a display name and username to get started. You can change these any time.
          </Text>
          <TextField label="Display name" value={setupName} onChangeText={setSetupName} maxLength={60} />
          <TextField
            label="Username"
            value={setupUsername}
            onChangeText={setSetupUsername}
            autoCapitalize="none"
            maxLength={24}
          />
          <Text style={styles.hint}>
            Lowercase letters, numbers and underscores only. Always visible to others — doesn&rsquo;t
            need to be your real name, e.g. fantasticMouse92.
          </Text>
          {error && <Text style={styles.error}>{error}</Text>}
          <Button
            label="Create profile"
            onPress={onCreateProfile}
            disabled={settingUp || !setupName.trim() || !setupUsername.trim()}
          />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.subtitle}>{session?.user.email}</Text>

        <Pressable onPress={onPickPhoto} style={styles.photoRow} disabled={uploadingPhoto}>
          <Avatar name={displayName} photoUrl={photoUrl} size={72} />
          <Text style={styles.photoLabel}>{uploadingPhoto ? 'Uploading...' : 'Change photo'}</Text>
        </Pressable>

        <FieldRow label="Display name" value={displayName || 'Not set'} onEdit={() => setEditing('displayName')} />
        <FieldRow label="Username" value={username ? `@${username}` : 'Not set'} onEdit={() => setEditing('username')} />
        <Text style={styles.hint}>
          Your username is always visible to others and doesn&rsquo;t need to be your real name —
          e.g. fantasticMouse92.
        </Text>
        <FieldRow label="Bio" value={bio || 'Not set'} onEdit={() => setEditing('bio')} />

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Show my name/photo on my public thoughts and replies</Text>
          <Switch value={showIdentity} onValueChange={onToggleIdentity} />
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <Button label="Notifications" variant="ghost" onPress={() => router.push('/notifications')} />
        <Button label="Sign out" variant="ghost" onPress={() => supabase.auth.signOut()} />
      </ScrollView>

      {editing && (
        <EditFieldModal
          visible
          label={FIELD_CONFIG[editing].label}
          value={editing === 'displayName' ? displayName : editing === 'username' ? username : bio}
          maxLength={FIELD_CONFIG[editing].maxLength}
          multiline={FIELD_CONFIG[editing].multiline}
          autoCapitalize={FIELD_CONFIG[editing].autoCapitalize}
          hint={FIELD_CONFIG[editing].hint}
          onCancel={() => setEditing(null)}
          onSave={onSaveField}
        />
      )}
    </ScreenContainer>
  );
}

function FieldRow({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  return (
    <View style={styles.fieldRow}>
      <View style={styles.fieldText}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={styles.fieldValue}>{value}</Text>
      </View>
      <Pressable onPress={onEdit} accessibilityLabel={`Edit ${label}`}>
        <Text style={styles.editLink}>Edit</Text>
      </Pressable>
    </View>
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
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  fieldText: {
    flex: 1,
  },
  fieldLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
  },
  fieldValue: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.md,
    color: colors.textPrimary,
    marginTop: 2,
  },
  editLink: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.accent,
  },
  hint: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: -spacing.xs,
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
});
