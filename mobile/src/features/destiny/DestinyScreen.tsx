import { useEffect, useState } from 'react';
import { ActivityIndicator, useWindowDimensions, ScrollView, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts, PlayfairDisplay_400Regular_Italic } from '@expo-google-fonts/playfair-display';

import { Avatar } from '@/components/Avatar';
import { LanguagePickerModal } from '@/components/LanguagePickerModal';
import { MoodTag } from '@/components/MoodTag';
import { ScreenContainer } from '@/components/ScreenContainer';
import { translateThought } from '@/features/thoughts/api';
import { ApiError } from '@/lib/api';
import { useSession } from '@/features/auth/SessionProvider';
import { ThoughtDetailOverlay } from '@/features/universe/ThoughtDetailOverlay';
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
  // 'choosing': the "Let it drift" / "Reply" choice. 'drifted': its terminal
  // state. Reply itself opens the same ThoughtDetailOverlay used everywhere
  // else (see showReply below) rather than its own inline reply UI.
  const [stage, setStage] = useState<'choosing' | 'drifted'>('choosing');
  const [showReply, setShowReply] = useState(false);
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
            {translation.error && <Text style={styles.error}>{translation.error}</Text>}

            {stage === 'drifted' && <Text style={styles.outcome}>Let it drift on by.</Text>}
          </View>
        )}

        {thought && stage === 'choosing' && (
          <View style={styles.choiceRow}>
            <Pressable style={styles.driftButton} onPress={() => setStage('drifted')}>
              <Ionicons name="shuffle-outline" size={16} color="white" />
              <Text style={styles.driftLabel}>Let it drift</Text>
            </Pressable>
            <Pressable onPress={() => setShowReply(true)} style={styles.replyButtonWrapper}>
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

      {showReply && thought && (
        <ThoughtDetailOverlay
          thought={thought}
          autoFocusReply
          initialShowTranslation={translation.showingTranslation}
          onClose={() => setShowReply(false)}
          onDeleted={() => setShowReply(false)}
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
});
