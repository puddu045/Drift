import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts, PlayfairDisplay_700Bold, PlayfairDisplay_400Regular_Italic } from '@expo-google-fonts/playfair-display';

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
  useFonts({ PlayfairDisplay_700Bold, PlayfairDisplay_400Regular_Italic });

  // Seeded from usePrefetchTabs (warmed right after sign-in) when present,
  // so a first visit this session can render immediately instead of a
  // spinner — the fetch below still runs regardless, to keep it fresh.
  const [thought, setThought] = useState<Thought | null>(() => getCached(PREFETCH_KEYS.destinyToday) ?? null);
  const [error, setError] = useState<string | null>(null);
  // 'choosing': the "Let it drift" / "Reply" choice. 'replying': the open
  // text input. 'sent'/'drifted': the two terminal states.
  const [stage, setStage] = useState<'choosing' | 'replying' | 'sent' | 'drifted'>('choosing');
  const [replyText, setReplyText] = useState('');
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
    setStage('sent');
  };

  return (
    <ScreenContainer floatingTabBar background="night">
      <View style={styles.header}>
        <Image
          source={require('../../../assets/destiny-sparkle.webp')}
          style={styles.sparkle}
          resizeMode="contain"
        />
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

            {stage === 'sent' && <Text style={styles.outcome}>Your reply drifted their way.</Text>}
            {stage === 'drifted' && <Text style={styles.outcome}>Let it drift on by.</Text>}

            {stage === 'replying' && (
              <View style={styles.replyRow}>
                <TextInput
                  style={styles.input}
                  value={replyText}
                  onChangeText={setReplyText}
                  placeholder="Reply..."
                  placeholderTextColor={colors.textSecondary}
                  maxLength={280}
                  autoFocus
                />
                <Button label="Send" onPress={onReply} disabled={!replyText.trim()} />
              </View>
            )}
          </Card>
        )}

        {thought && stage === 'choosing' && (
          <View style={styles.choiceRow}>
            <Pressable style={styles.driftButton} onPress={() => setStage('drifted')}>
              <Ionicons name="shuffle-outline" size={16} color={colors.textPrimary} />
              <Text style={styles.driftLabel}>Let it drift</Text>
            </Pressable>
            <Pressable onPress={() => setStage('replying')} style={styles.replyButtonWrapper}>
              <LinearGradient
                colors={['#FADCC4', '#F3B88F']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.replyButton}
              >
                <Ionicons name="heart-outline" size={16} color="#FFFFFF" />
                <Text style={styles.replyLabel}>Reply</Text>
              </LinearGradient>
            </Pressable>
          </View>
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
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  sparkle: {
    width: 32,
    height: 32,
    marginBottom: spacing.xs,
  },
  title: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: typography.size.xxl,
    // White, not the usual dark textPrimary — this header sits directly on
    // the dark night-sky background, not a card.
    color: '#FFFFFF',
  },
  subtitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  card: {
    gap: spacing.md,
    // Peach, with a little transparency — not the plain white/opaque card
    // used elsewhere, but still opaque enough for the dark-navy text inside
    // it to stay legible over the night-sky background.
    backgroundColor: 'rgba(248, 201, 167, 0.72)',
    borderColor: 'rgba(255, 255, 255, 0.7)',
  },
  text: {
    fontFamily: 'PlayfairDisplay_400Regular_Italic',
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
  outcome: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.sm,
    color: colors.textPrimary,
  },
  translateLink: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.accent,
  },
  choiceRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  driftButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minHeight: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
  },
  driftLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
  },
  replyButtonWrapper: {
    flex: 1,
    borderRadius: 22,
    overflow: 'hidden',
  },
  replyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
  },
  replyLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: '#FFFFFF',
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
