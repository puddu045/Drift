import { useCallback, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';

import { ScreenContainer } from '@/components/ScreenContainer';
import { sampleThoughts, SampleThought } from '@/data/sampleThoughts';
import { colors, spacing, typography } from '@/theme';

import { Bubble } from './Bubble';
import { ThoughtDetailOverlay } from './ThoughtDetailOverlay';
import { useBubbleLayout } from './useBubbleLayout';
import { useReducedMotion } from './useReducedMotion';

export function UniverseScreen() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [selected, setSelected] = useState<SampleThought | null>(null);
  const reduceMotion = useReducedMotion();

  const layouts = useBubbleLayout(sampleThoughts.length, size.width, size.height);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize({ width, height });
  }, []);

  return (
    <ScreenContainer edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Universe</Text>
        <Text style={styles.subtitle}>Somewhere, someone feels the same.</Text>
      </View>

      <View style={styles.field} onLayout={onLayout}>
        {layouts.length > 0 &&
          sampleThoughts.map((thought, i) => (
            <Bubble
              key={thought.id}
              thought={thought}
              layout={layouts[i]}
              reduceMotion={reduceMotion}
              paused={selected?.id === thought.id}
              onPress={() => setSelected(thought)}
            />
          ))}
      </View>

      {selected && (
        <ThoughtDetailOverlay thought={selected} onClose={() => setSelected(null)} />
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
    color: colors.textPrimary,
  },
  subtitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  field: {
    flex: 1,
  },
});
