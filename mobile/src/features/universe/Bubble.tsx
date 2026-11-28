import { useEffect } from 'react';
import { Image, ImageSourcePropType, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { colors, moodColors, MoodId, spacing, typography } from '@/theme';
import { Thought } from '@/features/thoughts/api';

import { BubbleLayout } from './useBubbleLayout';

// How far the bubble tilts in 3D as it drifts, in degrees — enough to read
// as a floating orb catching the light differently as it turns, not so much
// it looks like it's spinning.
const TILT_DEGREES = 7;

// Fraction of the bubble's size used as its corner radius — a soft
// "squircle", not a full circle. Shared between the view's own borderRadius
// and the mood-bubble images below, which were cropped with a matching ratio.
const CORNER_RATIO = 0.24;

// Frosted-glass mood-bubble art (AI-generated per the user's own prompt),
// one per mood, already colored and highlighted — no separate color fill or
// generic texture needed on top. 'lonely' has none yet, so it falls back to
// one of the old generic glass textures instead of going flat.
const MOOD_BUBBLES: Partial<Record<MoodId, ImageSourcePropType>> = {
  love: require('../../../assets/mood-bubble-love.webp'),
  deep: require('../../../assets/mood-bubble-deep.webp'),
  happy: require('../../../assets/mood-bubble-happy.webp'),
  reflective: require('../../../assets/mood-bubble-reflective.webp'),
  hopeful: require('../../../assets/mood-bubble-hopeful.webp'),
  random: require('../../../assets/mood-bubble-random.webp'),
  curious: require('../../../assets/mood-bubble-curious.webp'),
};

const FALLBACK_GLASS_TEXTURES = [
  require('../../../assets/bubble-glass-1.webp'),
  require('../../../assets/bubble-glass-2.webp'),
  require('../../../assets/bubble-glass-3.webp'),
];

function bubbleTextureFor(mood: MoodId, id: string) {
  const moodBubble = MOOD_BUBBLES[mood];
  if (moodBubble) return moodBubble;
  let sum = 0;
  for (let i = 0; i < id.length; i++) sum += id.charCodeAt(i);
  return FALLBACK_GLASS_TEXTURES[sum % FALLBACK_GLASS_TEXTURES.length];
}

type Props = {
  thought: Thought;
  layout: BubbleLayout;
  reduceMotion: boolean;
  paused: boolean;
  onPress: () => void;
  hasNotification?: boolean;
};

export function Bubble({ thought, layout, reduceMotion, paused, onPress, hasNotification }: Props) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion || paused) {
      cancelAnimation(progress);
      return;
    }
    progress.value = withRepeat(
      withTiming(1, { duration: layout.periodMs, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(progress);
  }, [reduceMotion, paused, layout.periodMs, progress]);

  const animatedStyle = useAnimatedStyle(() => {
    if (reduceMotion) {
      return { transform: [{ translateX: 0 }, { translateY: 0 }, { rotateX: '0deg' }, { rotateY: '0deg' }] };
    }
    // Every term here must be a function of the SAME angle (progress scaled
    // by exactly one full turn) — using a frequency multiplier like
    // `angle * 1.3` instead of a phase offset looks more organic at a
    // glance, but it isn't periodic over one repeat of `progress` (0→1),
    // so the moment `progress` wraps back to 0, that term snaps to a
    // different value than it ended on: a visible mid-drift pixel jump.
    // Phase offsets keep every term exactly periodic in `angle`, so the
    // wrap is seamless, while still giving each axis its own timing.
    const angle = progress.value * Math.PI * 2 + layout.phase;
    return {
      transform: [
        { translateX: Math.cos(angle) * layout.driftRadiusX },
        { translateY: Math.sin(angle + Math.PI / 2) * layout.driftRadiusY },
        { perspective: 400 },
        { rotateY: `${Math.cos(angle) * TILT_DEGREES}deg` },
        { rotateX: `${Math.sin(angle + Math.PI / 3) * (TILT_DEGREES * 0.75)}deg` },
      ],
    };
  });

  const moodColor = moodColors[thought.mood];
  const cornerRadius = layout.size * (layout.size >= 165 ? 0.46 : CORNER_RATIO);

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { left: layout.x, top: layout.y, width: layout.size, height: layout.size },
        animatedStyle,
      ]}
    >
      {/* Shadow lives on its own layer, separate from the Pressable below —
          overflow:hidden (needed to clip the gradients to the shape) also
          clips a shadow if they're on the same view. */}
      <View
        style={[
          styles.shadowLayer,
          { width: layout.size, height: layout.size, borderRadius: cornerRadius, shadowColor: moodColor },
        ]}
      >
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={`Thought: ${thought.text}`}
          style={[
            styles.bubble,
            {
              width: layout.size,
              height: layout.size,
              borderRadius: cornerRadius,
              borderColor: 'rgba(255,255,255,0.85)',
              backgroundColor: moodColor + 'AA',
            },
          ]}
        >
          <Image
            source={bubbleTextureFor(thought.mood, thought.id)}
            resizeMode="cover"
            style={[StyleSheet.absoluteFill, { opacity: 0.32, width: layout.size, height: layout.size }]}
          />
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(255,255,255,0.78)', 'rgba(255,255,255,0.22)', 'rgba(255,246,238,0.52)']}
            start={{ x: 0, y: 0 }} end={{ x: 0.85, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text numberOfLines={layout.size >= 165 ? 6 : 4} style={[styles.text, layout.size >= 165 && styles.featuredText]}>
            {thought.text}
          </Text>
          {hasNotification && <View style={styles.notificationDot} accessibilityLabel="New activity" />}
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
  },
  shadowLayer: {
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  bubble: {
    overflow: 'hidden',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  text: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.sm,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  featuredText: { fontSize: 18, lineHeight: 23 },
  notificationDot: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.danger,
    borderWidth: 1.5,
    borderColor: colors.background,
  },
});
