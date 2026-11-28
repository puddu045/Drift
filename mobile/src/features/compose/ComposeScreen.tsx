import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Button } from '@/components/Button';
import { ScreenContainer } from '@/components/ScreenContainer';
import { useTranslation } from '@/i18n';
import { createThought } from '@/features/thoughts/api';
import { ApiError } from '@/lib/api';
import { colors, MoodId, moodColors, moodIcons, palette, radius, spacing, typography } from '@/theme';

const MAX_LENGTH = 280;

export function ComposeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const MOODS: { id: MoodId; label: string }[] = [
    { id: 'love', label: t('mood.love') },
    { id: 'deep', label: t('mood.deep') },
    { id: 'happy', label: t('mood.happy') },
    { id: 'reflective', label: t('mood.reflective') },
    { id: 'hopeful', label: t('mood.hopeful') },
    { id: 'random', label: t('mood.random') },
    { id: 'lonely', label: t('mood.lonely') },
    { id: 'curious', label: t('mood.curious') },
  ];
  const [text, setText] = useState('');
  const [mood, setMood] = useState<MoodId | null>(null);
  const [isPublic, setIsPublic] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = text.trim().length > 0 && mood !== null && !submitting;

  const onClose = () => router.navigate('/(tabs)');

  const onSubmit = async () => {
    if (!mood || !text.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await createThought({ text: text.trim(), mood, isPublic });
      setText('');
      setMood(null);
      // Land on My Thoughts, not whatever mode Universe was last showing.
      router.navigate({ pathname: '/(tabs)', params: { mode: 'mine' } });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('compose.couldNotRelease'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer background="haze">
      <View style={styles.header}>
        <Pressable onPress={onClose} accessibilityLabel={t('common.close')} style={styles.closeButton}>
          <Ionicons name="close" size={22} color={colors.textPrimary} />
        </Pressable>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t('compose.title')}</Text>
        <Text style={styles.subtitle}>{t('compose.subtitle')}</Text>

        <View>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={(value) => setText(value.slice(0, MAX_LENGTH))}
            placeholder={t('compose.placeholder')}
            placeholderTextColor={colors.textSecondary}
            multiline
            maxLength={MAX_LENGTH}
          />
          <Text style={styles.counter}>
            {text.length}/{MAX_LENGTH}
          </Text>
        </View>

        <Text style={styles.sectionLabel}>{t('compose.chooseMood')}</Text>
        <View style={styles.moodRow}>
          {MOODS.map((item) => {
            const icon = moodIcons[item.id];
            return (
              <View
                key={item.id}
                style={[
                  styles.moodOption,
                  { backgroundColor: mood === item.id ? moodColors[item.id] : '#FBF8F6' },
                  mood === item.id && styles.moodOptionSelected,
                ]}
                onTouchEnd={() => setMood(item.id)}
              >
                {icon && <Image source={icon} style={styles.moodIcon} resizeMode="contain" />}
                <Text style={styles.moodLabel}>{item.label}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.privacyRow}>
          <View style={styles.privacyLabelRow}>
            <Ionicons name="globe-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.sectionLabel}>{t('compose.discoverable')}</Text>
          </View>
          <Switch trackColor={{ true: '#264D7F' }} value={isPublic} onValueChange={setIsPublic} />
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <Button
          label={t('compose.submit')} variant="brand"
          onPress={onSubmit}
          disabled={!canSubmit}
          style={styles.submitButton}
          labelColor="#FFFFFF"
          icon={<Ionicons name="paper-plane" size={18} color="#FFFFFF" />}
        />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexGrow: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: -spacing.sm,
  },
  input: {
    boxShadow: '0px 3px 10px rgba(35,42,68,0.08)',
    minHeight: 120,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: 'rgba(29,39,68,0.1)',
    // Peach, semi-transparent — a "glass" tint over whatever's behind it
    // rather than an opaque fill.
    backgroundColor: '#FFFCFB',
    padding: spacing.md,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontSize: typography.size.md,
    textAlignVertical: 'top',
  },
  counter: {
    alignSelf: 'flex-end',
    marginTop: 4,
    fontFamily: typography.fontFamily,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
  },
  sectionLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  moodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  moodOption: {
    width: '31%',
    justifyContent: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: 'rgba(29,39,68,0.10)',
  },
  moodIcon: {
    width: 16,
    height: 16,
  },
  moodOptionSelected: {
    borderColor: colors.textPrimary,
  },
  moodLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    // Mood options are always a light pastel, so this stays the palette's
    // dark anchor tone regardless of the app's overall theme.
    color: palette.navy,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  privacyLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  error: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.sm,
    color: colors.danger,
  },
  submitButton: {
    marginTop: 'auto',

  },
});
