import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '@/components/Button';
import { ScreenContainer } from '@/components/ScreenContainer';
import { createThought } from '@/features/thoughts/api';
import { ApiError } from '@/lib/api';
import { colors, MoodId, moodColors, palette, radius, spacing, typography } from '@/theme';

const MOODS: { id: MoodId; label: string }[] = [
  { id: 'love', label: 'Love' },
  { id: 'deep', label: 'Deep' },
  { id: 'happy', label: 'Happy' },
  { id: 'reflective', label: 'Reflective' },
  { id: 'hopeful', label: 'Hopeful' },
  { id: 'random', label: 'Random' },
  { id: 'lonely', label: 'Lonely' },
  { id: 'curious', label: 'Curious' },
];

const MAX_LENGTH = 280;

export function ComposeScreen() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [mood, setMood] = useState<MoodId | null>(null);
  const [isPublic, setIsPublic] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = text.trim().length > 0 && mood !== null && !submitting;

  const onSubmit = async () => {
    if (!mood || !text.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await createThought({ text: text.trim(), mood, isPublic });
      setText('');
      setMood(null);
      router.navigate('/(tabs)');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not release this thought.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer floatingTabBar>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Release a thought</Text>

        <TextInput
          style={styles.input}
          value={text}
          onChangeText={(value) => setText(value.slice(0, MAX_LENGTH))}
          placeholder="What's on your mind?"
          placeholderTextColor={colors.textSecondary}
          multiline
          maxLength={MAX_LENGTH}
        />
        <Text style={styles.counter}>
          {text.length}/{MAX_LENGTH}
        </Text>

        <Text style={styles.sectionLabel}>Mood</Text>
        <View style={styles.moodRow}>
          {MOODS.map((item) => (
            <View
              key={item.id}
              style={[
                styles.moodOption,
                { backgroundColor: moodColors[item.id] },
                mood === item.id && styles.moodOptionSelected,
              ]}
              onTouchEnd={() => setMood(item.id)}
            >
              <Text style={styles.moodLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.privacyRow}>
          <Text style={styles.sectionLabel}>Discoverable by others</Text>
          <Switch value={isPublic} onValueChange={setIsPublic} />
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <Button label="Release into the universe" onPress={onSubmit} disabled={!canSubmit} />
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
  input: {
    minHeight: 120,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontSize: typography.size.md,
    textAlignVertical: 'top',
  },
  counter: {
    alignSelf: 'flex-end',
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    opacity: 0.55,
  },
  moodOptionSelected: {
    opacity: 1,
    borderWidth: 2,
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
  error: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.sm,
    color: colors.danger,
  },
});
