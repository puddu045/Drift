import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { colors, moodColors, radius, spacing, typography } from '@/theme';
import { Thought } from '@/features/thoughts/api';

import { BubbleLayout } from './useBubbleLayout';

// How far the bubble tilts in 3D as it drifts, in degrees — enough to read
// as a floating orb catching the light differently as it turns, not so much
// it looks like it's spinning.
const TILT_DEGREES = 7;

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
            },
          ]}
        >
          {/* Base tint: lit from the top-left, deepening toward the mood
              color at the bottom-right — reads as a curved, lit sphere
              rather than a flat tinted disc. */}
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.85)', `${moodColor}55`]}
            start={{ x: 0.15, y: 0.1 }}
            end={{ x: 0.9, y: 0.95 }}
            style={StyleSheet.absoluteFill}
          />
          {/* Glossy highlight, like light catching the top of glass. */}
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0)']}
            start={{ x: 0.1, y: 0.05 }}
            end={{ x: 0.7, y: 0.6 }}
            style={styles.highlight}
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
  highlight: {
    position: 'absolute',
    top: '8%',
    left: '10%',
    width: '55%',
    height: '45%',
    borderRadius: radius.lg * 3,
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
