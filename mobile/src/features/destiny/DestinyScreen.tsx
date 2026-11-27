import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { LanguagePickerModal } from '@/components/LanguagePickerModal';
import { MoodTag } from '@/components/MoodTag';
import { ScreenContainer } from '@/components/ScreenContainer';
import { replyToThought, Thought, translateThought } from '@/features/thoughts/api';
import { ApiError } from '@/lib/api';
import { getCached, setCached } from '@/lib/prefetchCache';
import { useTranslatable } from '@/lib/useTranslatable';
import { PREFETCH_KEYS } from '@/lib/usePrefetchTabs';
import { colors, spacing, typography } from '@/theme';

import { getTodayDestiny } from './api';

export function DestinyScreen() {
  // Seeded from usePrefetchTabs (warmed right after sign-in) when present,
  // so a first visit this session can render immediately instead of a
  // spinner — the fetch below still runs regardless, to keep it fresh.
  const [thought, setThought] = useState<Thought | null>(() => getCached(PREFETCH_KEYS.destinyToday) ?? null);
  const [error, setError] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sent, setSent] = useState(false);
  const translation = useTranslatable(() =>
    thought ? translateThought(thought.id) : Promise.reject(new Error('No thought yet')),
  );

  useEffect(() => {
    getTodayDestiny()
      .then((result) => {
        setThought(result);
        setCached(PREFETCH_KEYS.destinyToday, result);
      })
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : 'No Destiny thought available today.'),
      );
  }, []);

  const onReply = async () => {
    if (!thought || !replyText.trim()) return;
    await replyToThought(thought.id, replyText.trim());
    setReplyText('');
    setSent(true);
  };

  return (
    <ScreenContainer floatingTabBar background="night">
      <View style={styles.header}>
        <Text style={styles.title}>Destiny</Text>
        <Text style={styles.subtitle}>One stranger&rsquo;s thought, just for you today.</Text>
      </View>

      <View style={styles.content}>
        {!thought && !error && <ActivityIndicator color={colors.accent} />}
        {error && <Text style={styles.error}>{error}</Text>}
        {thought && (
          <Card style={styles.card}>
            <MoodTag mood={thought.mood} />
            <Text style={styles.text}>{translation.text ?? thought.text}</Text>
            <Pressable onPress={translation.toggle} disabled={translation.loading}>
              <Text style={styles.translateLink}>
                {translation.loading
                  ? 'Translating…'
                  : translation.showingTranslation
                    ? 'Show original'
                    : 'Translate'}
              </Text>
            </Pressable>
            {sent ? (
              <Text style={styles.sent}>Your reply drifted their way.</Text>
            ) : (
              <View style={styles.replyRow}>
                <TextInput
                  style={styles.input}
                  value={replyText}
                  onChangeText={setReplyText}
                  placeholder="Reply..."
                  placeholderTextColor={colors.textSecondary}
                  maxLength={280}
                />
                <Button label="Send" onPress={onReply} disabled={!replyText.trim()} />
              </View>
            )}
          </Card>
        )}
      </View>

      {translation.needsLanguage && (
        <LanguagePickerModal
          selected={null}
          onCancel={translation.dismissLanguagePrompt}
          onSelect={translation.onLanguageChosen}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    // White, not the usual dark textPrimary — this header sits directly on
    // the dark night-sky background, not a card.
    color: '#FFFFFF',
  },
  subtitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: spacing.xs,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  card: {
    gap: spacing.md,
    // More opaque than Card's default — needed for the dark-navy text
    // inside it to stay legible over the night-sky background.
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
  },
  text: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.lg,
    color: colors.textPrimary,
    lineHeight: 28,
  },
  error: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.sm,
    color: colors.danger,
    textAlign: 'center',
  },
  sent: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.sm,
    color: colors.accent,
  },
  translateLink: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.accent,
  },
  replyRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    minHeight: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontSize: typography.size.sm,
  },
});
