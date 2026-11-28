import { getCached } from '@/lib/prefetchCache';
import type { Profile } from './api';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { EditFieldModal } from '@/components/EditFieldModal';
import { InterestsEditModal } from '@/components/InterestsEditModal';
import { LanguagePickerModal } from '@/components/LanguagePickerModal';
import { ScreenContainer } from '@/components/ScreenContainer';
import { TextField } from '@/components/TextField';
import { useSession } from '@/features/auth/SessionProvider';
import { listBlocked, unblockUser } from '@/features/blocks/api';
import { listMuted, unmuteUser } from '@/features/mutes/api';
import {
  getMyInterestIds,
  getOwnProfile,
  getPublicProfile,
  getTranslationUsage,
  Interest,
  listInterests,
  setMyInterests,
  TranslationUsage,
  updatePreferences,
  upsertOwnProfile,
} from '@/features/profile/api';
import { languageLabel } from '@/features/profile/languages';
import { useTranslation } from '@/i18n';
import { supabase } from '@/lib/supabase';
import { ApiError } from '@/lib/api';
import { colors, radius, spacing, typography } from '@/theme';

type FieldKey = 'displayName' | 'username' | 'bio' | null;

function describeError(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

export function ProfileScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { session } = useSession();
  const cached = session && getCached<Profile>('profile:' + session.user.id);
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
    displayName: { label: t('profile.displayName'), maxLength: 60 },
    username: {
      label: t('profile.username'),
      maxLength: 24,
      autoCapitalize: 'none',
      hint: t('profile.usernameFieldHint'),
    },
    bio: { label: t('profile.bio'), maxLength: 280, multiline: true },
  };
  const [hasProfile, setHasProfile] = useState(!!cached);
  const [displayName, setDisplayName] = useState(cached?.displayName ?? '');
  const [username, setUsername] = useState(cached?.username ?? '');
  const [bio, setBio] = useState(cached?.bio ?? '');
  const [photoUrl, setPhotoUrl] = useState<string | null>(cached?.photoUrl ?? null);
  const [showIdentity, setShowIdentity] = useState(cached?.showIdentityOnContent ?? false);
  const [preferredLanguage, setPreferredLanguage] = useState<string | null>(cached?.preferredLanguage ?? null);
  const [editingLanguage, setEditingLanguage] = useState(false);
  const [loading, setLoading] = useState(!cached);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<FieldKey>(null);
  const [allInterests, setAllInterests] = useState<Interest[]>([]);
  const [myInterestIds, setMyInterestIds] = useState<string[]>([]);
  const [editingInterests, setEditingInterests] = useState(false);
  const [mutedUsers, setMutedUsers] = useState<{ userId: string; name: string }[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<{ userId: string; name: string }[]>([]);
  const [translationUsage, setTranslationUsage] = useState<TranslationUsage | null>(null);

  // First-time setup fields — a profile can't be created without these three.
  const [setupName, setSetupName] = useState('');
  const [setupUsername, setSetupUsername] = useState('');
  const [setupLanguage, setSetupLanguage] = useState<string | null>(null);
  const [editingSetupLanguage, setEditingSetupLanguage] = useState(false);
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
        setPreferredLanguage(profile.preferredLanguage);
      })
      .catch(() => {
        // No profile yet — expected for a brand-new account, handled by the
        // setup card below rather than treated as an error.
      })
      .finally(() => setLoading(false));
    listInterests().then(setAllInterests).catch(() => {});
    getMyInterestIds().then(setMyInterestIds).catch(() => {});
    getTranslationUsage().then(setTranslationUsage).catch(() => {});
    listMuted()
      .then((mutes) => {
        setMutedUsers(mutes.map((m) => ({ userId: m.mutedId, name: 'Muted user' })));
        mutes.forEach((m) => {
          getPublicProfile(m.mutedId)
            .then((profile) =>
              setMutedUsers((prev) =>
                prev.map((u) => (u.userId === m.mutedId ? { ...u, name: profile.displayName } : u)),
              ),
            )
            .catch(() => {});
        });
      })
      .catch(() => {});
    listBlocked()
      .then((blocks) => {
        setBlockedUsers(blocks.map((b) => ({ userId: b.blockedId, name: 'Blocked user' })));
        blocks.forEach((b) => {
          getPublicProfile(b.blockedId)
            .then((profile) =>
              setBlockedUsers((prev) =>
                prev.map((u) => (u.userId === b.blockedId ? { ...u, name: profile.displayName } : u)),
              ),
            )
            .catch(() => {});
        });
      })
      .catch(() => {});
  }, []);

  const onUnmute = async (userId: string) => {
    setMutedUsers((prev) => prev.filter((u) => u.userId !== userId));
    await unmuteUser(userId);
  };

  const onUnblock = async (userId: string) => {
    setBlockedUsers((prev) => prev.filter((u) => u.userId !== userId));
    await unblockUser(userId);
  };

  const onCreateProfile = async () => {
    if (!setupName.trim() || !setupUsername.trim() || !setupLanguage) return;
    setSettingUp(true);
    setError(null);
    try {
      const profile = await upsertOwnProfile({
        displayName: setupName.trim(),
        username: setupUsername.trim().toLowerCase(),
      });
      await updatePreferences({ preferredLanguage: setupLanguage });
      setHasProfile(true);
      setDisplayName(profile.displayName);
      setUsername(profile.username);
      setBio(profile.bio ?? '');
      setPhotoUrl(profile.photoUrl);
      setPreferredLanguage(setupLanguage);
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

  const onSelectLanguage = async (code: string) => {
    setPreferredLanguage(code);
    setEditingLanguage(false);
    await updatePreferences({ preferredLanguage: code });
  };

  const onSaveInterests = async (ids: string[]) => {
    setMyInterestIds(ids);
    setEditingInterests(false);
    try {
      await setMyInterests(ids);
    } catch (err) {
      setError(describeError(err, 'Could not save your interests.'));
    }
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

  if (loading) return <ScreenContainer background="haze"><View style={styles.content}><Text style={styles.title}>{t('profile.title')}</Text><Text>{t('profile.loading')}</Text></View></ScreenContainer>;

  if (!hasProfile) {
    return (
      <ScreenContainer background="haze">
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <Text style={styles.title}>{t('profile.setupTitle')}</Text>
          <Text style={styles.subtitle}>{t('profile.setupSubtitle')}</Text>
          <TextField label={t('profile.displayName')} value={setupName} onChangeText={setSetupName} maxLength={60} />
          <TextField
            label={t('profile.username')}
            value={setupUsername}
            onChangeText={setSetupUsername}
            autoCapitalize="none"
            maxLength={24}
          />
          <Text style={styles.hint}>{t('profile.usernameHint')}</Text>

          <FieldRow
            label={t('profile.defaultLanguage')}
            value={setupLanguage ? languageLabel(setupLanguage) : t('profile.chooseOne')}
            onEdit={() => setEditingSetupLanguage(true)}
            editLabel={t('profile.edit')}
          />
          <Text style={styles.hint}>{t('profile.languageHint')}</Text>

          {error && <Text style={styles.error}>{error}</Text>}
          <Button
            label={t('profile.createProfile')}
            onPress={onCreateProfile}
            disabled={settingUp || !setupName.trim() || !setupUsername.trim() || !setupLanguage}
          />
        </ScrollView>

        {editingSetupLanguage && (
          <LanguagePickerModal
            selected={setupLanguage}
            onCancel={() => setEditingSetupLanguage(false)}
            onSelect={(code) => {
              setSetupLanguage(code);
              setEditingSetupLanguage(false);
            }}
          />
        )}
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer background="haze">
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()} accessibilityLabel={t('common.back')}>
          <Text style={styles.back}>‹ {t('common.back')}</Text>
        </Pressable>
        <Text style={styles.title}>{t('profile.title')}</Text>

        <Pressable onPress={onPickPhoto} style={styles.photoRow} disabled={uploadingPhoto}>
          <Avatar name={displayName} photoUrl={photoUrl} size={72} />
          <View style={{ flex: 1, gap: 3 }}><Text style={styles.author}>{displayName}</Text><Text style={styles.photoLabel}>{uploadingPhoto ? t('profile.uploading') : t('profile.changePhoto')}</Text></View>
        </Pressable>

        <FieldRow label={t('profile.displayName')} value={displayName || t('profile.notSet')} onEdit={() => setEditing('displayName')} editLabel={t('profile.edit')} />
        <FieldRow label={t('profile.username')} value={username ? `@${username}` : t('profile.notSet')} onEdit={() => setEditing('username')} editLabel={t('profile.edit')} />
        <Text style={styles.hint}>{t('profile.usernameHintShort')}</Text>
        <FieldRow label={t('profile.bio')} value={bio || t('profile.notSet')} onEdit={() => setEditing('bio')} editLabel={t('profile.edit')} />

        <View style={styles.fieldRow}>
          <View style={styles.fieldText}>
            <Text style={styles.fieldLabel}>{t('profile.email')}</Text>
            <Text style={styles.fieldValue}>{session?.user.email}</Text>
          </View>
        </View>
        <Text style={styles.hint}>{t('profile.emailHint')}</Text>

        <FieldRow
          label={t('profile.interests')}
          value={
            myInterestIds.length > 0
              ? allInterests
                  .filter((interest) => myInterestIds.includes(interest.id))
                  .map((interest) => interest.name)
                  .join(', ')
              : t('profile.notSet')
          }
          onEdit={() => setEditingInterests(true)}
          editLabel={t('profile.edit')}
        />

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>{t('profile.showIdentity')}</Text>
          <Switch value={showIdentity} onValueChange={onToggleIdentity} />
        </View>

        <FieldRow
          label={t('profile.defaultLanguage')}
          value={languageLabel(preferredLanguage)}
          onEdit={() => setEditingLanguage(true)}
          editLabel={t('profile.edit')}
        />

        {translationUsage && (
          <>
            <View style={styles.fieldRow}>
              <View style={styles.fieldText}>
                <Text style={styles.fieldLabel}>{t('profile.translationsUsedToday')}</Text>
                <Text style={styles.fieldValue}>
                  {translationUsage.used} / {translationUsage.limit}
                </Text>
              </View>
            </View>
            <Text style={styles.hint}>{t('profile.translationsUsedHint')}</Text>
          </>
        )}

        {mutedUsers.length > 0 && (
          <View style={styles.mutedSection}>
            <Text style={styles.fieldLabel}>{t('profile.muted')}</Text>
            {mutedUsers.map((u) => (
              <View key={u.userId} style={styles.fieldRow}>
                <Text style={styles.fieldValue}>{u.name}</Text>
                <Pressable onPress={() => onUnmute(u.userId)} accessibilityLabel={`${t('profile.unmute')} ${u.name}`}>
                  <Text style={styles.editLink}>{t('profile.unmute')}</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {blockedUsers.length > 0 && (
          <View style={styles.mutedSection}>
            <Text style={styles.fieldLabel}>Blocked</Text>
            {blockedUsers.map((u) => (
              <View key={u.userId} style={styles.fieldRow}>
                <Text style={styles.fieldValue}>{u.name}</Text>
                <Pressable onPress={() => onUnblock(u.userId)} accessibilityLabel={`Unblock ${u.name}`}>
                  <Text style={styles.editLink}>Unblock</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {error && <Text style={styles.error}>{error}</Text>}

        <Button label={t('profile.signOut')} variant="destructive" onPress={() => supabase.auth.signOut()} />
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

      {editingInterests && (
        <InterestsEditModal
          allInterests={allInterests}
          selectedIds={myInterestIds}
          onCancel={() => setEditingInterests(false)}
          onSave={onSaveInterests}
        />
      )}

      {editingLanguage && (
        <LanguagePickerModal
          selected={preferredLanguage}
          onCancel={() => setEditingLanguage(false)}
          onSelect={onSelectLanguage}
        />
      )}
    </ScreenContainer>
  );
}

function FieldRow({
  label,
  value,
  onEdit,
  editLabel,
}: {
  label: string;
  value: string;
  onEdit: () => void;
  editLabel: string;
}) {
  return (
    <View style={styles.fieldRow}>
      <View style={styles.fieldText}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={styles.fieldValue}>{value}</Text>
      </View>
      <Pressable onPress={onEdit} accessibilityLabel={`${editLabel} ${label}`}>
        <Text style={styles.editLink}>{editLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    alignSelf: 'center', width: '100%', maxWidth: 650,
    padding: spacing.lg,
    gap: spacing.md,
  },
  back: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.md,
    color: '#25466E',
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
    backgroundColor: '#F2EDF5', padding: 18, borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  author: { fontSize: 22, fontWeight: '600', color: colors.textPrimary },
  photoLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.sm,
    color: '#25466E',
  },
  fieldRow: {
    backgroundColor: '#FFFCFA', minHeight: 60, boxShadow: '0px 2px 8px rgba(35,42,68,0.08)',
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
    color: '#25466E',
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
  mutedSection: {
    gap: spacing.xs,
  },
  error: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.sm,
    color: colors.danger,
  },
});
