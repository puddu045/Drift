import { useEffect } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
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

type Props = {
  thought: Thought;
  layout: BubbleLayout;
  reduceMotion: boolean;
  paused: boolean;
  onPress: () => void;
};

export function Bubble({ thought, layout, reduceMotion, paused, onPress }: Props) {
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
    if (reduceMotion) return { transform: [{ translateX: 0 }, { translateY: 0 }] };
    const angle = progress.value * Math.PI * 2 + layout.phase;
    return {
      transform: [
        { translateX: Math.cos(angle) * layout.driftRadiusX },
        { translateY: Math.sin(angle * 1.3) * layout.driftRadiusY },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { left: layout.x, top: layout.y, width: layout.size, height: layout.size },
        animatedStyle,
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
            borderColor: moodColors[thought.mood],
          },
        ]}
      >
        <Text numberOfLines={4} style={styles.text}>
          {thought.text}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
  },
  bubble: {
    borderRadius: radius.lg * 3,
    borderWidth: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    shadowColor: colors.textPrimary,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  text: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.sm,
    color: colors.textPrimary,
    textAlign: 'center',
  },
});
