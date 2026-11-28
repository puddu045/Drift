import { useEffect, useState } from 'react';
import { ActivityIndicator, useWindowDimensions, ScrollView, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts, PlayfairDisplay_400Regular_Italic } from '@expo-google-fonts/playfair-display';

import { Button } from '@/components/Button';
import { Avatar } from '@/components/Avatar';
import { LanguagePickerModal } from '@/components/LanguagePickerModal';
import { MoodTag } from '@/components/MoodTag';
import { ScreenContainer } from '@/components/ScreenContainer';
import { replyToThought, translateThought } from '@/features/thoughts/api';
import { ApiError } from '@/lib/api';
import { useSession } from '@/features/auth/SessionProvider';
import { useTranslatable } from '@/lib/useTranslatable';
import { colors, spacing, typography } from '@/theme';

import { cachedDestiny, preloadDestiny } from './preload';

export function DestinyScreen() {
  const { height } = useWindowDimensions();
  const quoteSize = Math.max(20, Math.min(29, Math.round(height / 30)));
  useFonts({ PlayfairDisplay_400Regular_Italic });

  const userId = useSession().session?.user.id;
  const [preview, setPreview] = useState(() => userId ? cachedDestiny(userId) : undefined);
  const { thought, author } = preview ?? {};
  const [error, setError] = useState<string | null>(null);
  // 'choosing': the "Let it drift" / "Reply" choice. 'replying': the open
  // text input. 'sent'/'drifted': the two terminal states.
  const [stage, setStage] = useState<'choosing' | 'replying' | 'sent' | 'drifted'>('choosing');
  const [replyText, setReplyText] = useState('');
  const translation = useTranslatable(() =>
    thought ? translateThought(thought.id) : Promise.reject(new Error('No thought yet')),
  );

  useEffect(() => {
    if (!userId) return;
    let active = true;
    preloadDestiny(userId).then(result => {
      if (active) setPreview(result);
    }).catch((err: unknown) => {
      if (active) setError(err instanceof ApiError ? err.message : 'No Destiny thought available today.');
    });
    return () => { active = false; };
  }, [userId]);

  const onReply = async () => {
    if (!thought || !replyText.trim()) return;
    await replyToThought(thought.id, replyText.trim());
    setReplyText('');
    setStage('sent');
  };

  return (
    <ScreenContainer floatingTabBar background="twilight">
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        {!thought && !error && <ActivityIndicator color={colors.accent} />}
        {error && <Text style={styles.error}>{error}</Text>}
        {thought && (
          <View style={styles.card}>
            <MoodTag mood={thought.mood} />
            <Text style={[styles.text, { fontSize: quoteSize, lineHeight: Math.round(quoteSize * 1.34) }]}>&ldquo;{translation.text ?? thought.text}&rdquo;</Text>
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
          </View>
        )}

        {thought && stage === 'choosing' && (
          <View style={styles.choiceRow}>
            <Pressable style={styles.driftButton} onPress={() => setStage('drifted')}>
              <Ionicons name="shuffle-outline" size={16} color="white" />
              <Text style={styles.driftLabel}>Let it drift</Text>
            </Pressable>
            <Pressable onPress={() => setStage('replying')} style={styles.replyButtonWrapper}>
              <LinearGradient
                colors={['rgba(255,255,255,0.24)', 'rgba(255,255,255,0.12)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.replyButton}
              >
                <Ionicons name="heart-outline" size={16} color="white" />
                <Text style={styles.replyLabel}>Reply</Text>
              </LinearGradient>
            </Pressable>
          </View>
        )}
      </ScrollView>
      {thought && <View style={styles.byline}>
        <Avatar name={author?.displayName} photoUrl={author?.photoUrl} />
        <Text style={{ color: 'white', fontWeight: '600' }}>{author?.displayName ?? 'Anonymous'}</Text>
      </View>}

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
  byline: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 24, paddingBottom: 12 },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  card: { width: '90%', maxWidth: 420, alignSelf: 'center', alignItems: 'center', gap: 10, paddingHorizontal: spacing.md },
  text: {
    fontFamily: 'PlayfairDisplay_400Regular_Italic',

    color: 'white',

    textAlign: 'center',
    paddingVertical: spacing.md,
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
    color: 'white',
  },
  translateLink: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: 'white',
  },
  choiceRow: {
    alignSelf: 'center', width: '84%', maxWidth: 320,
    flexDirection: 'row',
    gap: spacing.md,
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
    color: 'white',
  },
  replyButtonWrapper: {
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.65)',
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
    color: 'white',
  },
  replyRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    minHeight: 40,
    backgroundColor: 'rgba(24,31,53,0.72)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    color: 'white',
    fontFamily: typography.fontFamily,
    fontSize: typography.size.sm,
  },
});
