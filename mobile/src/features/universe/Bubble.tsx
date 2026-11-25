import { useEffect } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { colors, moodColors, spacing, typography } from '@/theme';
import { Thought } from '@/features/thoughts/api';

import { BubbleLayout } from './useBubbleLayout';

// How far the bubble tilts in 3D as it drifts, in degrees — enough to read
// as a floating orb catching the light differently as it turns, not so much
// it looks like it's spinning.
const TILT_DEGREES = 7;

// AI-generated glass-bubble textures (the user's own prompt) — a few
// variants so bubbles don't all share an identical highlight placement.
const GLASS_TEXTURES = [
  require('../../../assets/bubble-glass-1.webp'),
  require('../../../assets/bubble-glass-2.webp'),
  require('../../../assets/bubble-glass-3.webp'),
];

function glassTextureFor(id: string) {
  let sum = 0;
  for (let i = 0; i < id.length; i++) sum += id.charCodeAt(i);
  return GLASS_TEXTURES[sum % GLASS_TEXTURES.length];
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
    const angle = progress.value * Math.PI * 2 + layout.phase;
    return {
      transform: [
        { translateX: Math.cos(angle) * layout.driftRadiusX },
        { translateY: Math.sin(angle * 1.3) * layout.driftRadiusY },
        { perspective: 400 },
        { rotateY: `${Math.cos(angle) * TILT_DEGREES}deg` },
        { rotateX: `${Math.sin(angle * 1.3) * (TILT_DEGREES * 0.75)}deg` },
      ],
    };
  });

  const moodColor = moodColors[thought.mood];

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { left: layout.x, top: layout.y, width: layout.size, height: layout.size },
        animatedStyle,
      ]}
    >
      {/* Shadow lives on its own layer, separate from the Pressable below —
          overflow:hidden (needed to clip the gradients to the circle) also
          clips a shadow if they're on the same view. */}
      <View
        style={[
          styles.shadowLayer,
          { width: layout.size, height: layout.size, borderRadius: layout.size, shadowColor: moodColor },
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
              borderRadius: layout.size,
              borderColor: moodColor,
              // Fully opaque, unlike the gradient below — otherwise the sky
              // background shows through and every bubble reads as the same
              // washed-out pale color regardless of mood.
              backgroundColor: moodColor,
            },
          ]}
        >
          {/* Soft sheen, lit from the top-left — reads as a curved, lit
              sphere rather than a flat tinted disc. */}
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.65)', 'rgba(255, 255, 255, 0)']}
            start={{ x: 0.15, y: 0.1 }}
            end={{ x: 0.85, y: 0.9 }}
            style={StyleSheet.absoluteFill}
          />
          {/* Real glass-bubble highlight/reflection texture, laid over the
              mood color so the color identity still reads through. */}
          <Image
            source={glassTextureFor(thought.id)}
            resizeMode="cover"
            style={[StyleSheet.absoluteFill, { width: layout.size, height: layout.size }]}
          />
          <Text numberOfLines={4} style={styles.text}>
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
