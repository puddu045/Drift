import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn, ZoomOut } from 'react-native-reanimated';

import { Button } from '@/components/Button';
import { MoodTag } from '@/components/MoodTag';
import { SampleThought } from '@/data/sampleThoughts';
import { colors, radius, spacing, typography } from '@/theme';

// Reactions and reply/connect actions are visual-only in this prototype —
// not wired to a backend yet (see /DEVELOPMENT_PLAN.md, Phase 2/3).
const REACTIONS = ['Heart', 'Relate', 'Beautiful', 'Thoughtful', 'Hug'];

type Props = {
  thought: SampleThought;
  onClose: () => void;
};

export function ThoughtDetailOverlay({ thought, onClose }: Props) {
  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(150)}
      style={styles.backdrop}
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
      <Animated.View
        entering={ZoomIn.duration(220)}
        exiting={ZoomOut.duration(160)}
        style={styles.card}
      >
        <MoodTag mood={thought.mood} />
        <Text style={styles.text}>{thought.text}</Text>

        <View style={styles.reactionRow}>
          {REACTIONS.map((reaction) => (
            <Pressable key={reaction} style={styles.reactionPill} accessibilityLabel={reaction}>
              <Text style={styles.reactionLabel}>{reaction}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.actions}>
          <Button label="Reply" variant="ghost" onPress={onClose} style={styles.actionButton} />
          <Button label="Connect" onPress={onClose} style={styles.actionButton} />
        </View>

        <Pressable onPress={onClose} accessibilityLabel="Close thought">
          <Text style={styles.close}>Let it drift away</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(16, 26, 53, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  text: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.lg,
    color: colors.textPrimary,
    lineHeight: 28,
  },
  reactionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  reactionPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reactionLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
  close: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
