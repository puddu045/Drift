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

import { moodColors, radius, spacing, typography } from '@/theme';
import { SampleThought } from '@/data/sampleThoughts';

import { BubbleLayout } from './useBubbleLayout';

type Props = {
  thought: SampleThought;
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
    backgroundColor: 'rgba(169, 201, 245, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    shadowColor: '#A9C9F5',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  text: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.sm,
    color: '#F8F9FD',
    textAlign: 'center',
  },
});
