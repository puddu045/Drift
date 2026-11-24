import { useCallback, useState } from 'react';
import { ActivityIndicator, LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { ScreenContainer } from '@/components/ScreenContainer';
import { ApiError } from '@/lib/api';
import { listThoughts, Thought } from '@/features/thoughts/api';
import { colors, spacing, typography } from '@/theme';

import { Bubble } from './Bubble';
import { ThoughtDetailOverlay } from './ThoughtDetailOverlay';
import { useBubbleLayout } from './useBubbleLayout';
import { useReducedMotion } from './useReducedMotion';

export function UniverseScreen() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [selected, setSelected] = useState<Thought | null>(null);
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();

  const layouts = useBubbleLayout(thoughts.length, size.width, size.height);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize({ width, height });
  }, []);

  // Refetch whenever the Universe tab regains focus (e.g. after posting a new
  // thought from Create), not just once on mount.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      listThoughts()
        .then((result) => {
          if (!cancelled) setThoughts(result.thoughts);
        })
        .catch((err: unknown) => {
          if (!cancelled) setError(err instanceof ApiError ? err.message : 'Could not load thoughts.');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  return (
    <ScreenContainer edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Universe</Text>
        <Text style={styles.subtitle}>Somewhere, someone feels the same.</Text>
      </View>

      <View style={styles.field} onLayout={onLayout}>
        {loading && thoughts.length === 0 && (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.accent} />
          </View>
        )}
        {error && (
          <View style={styles.centered}>
            <Text style={styles.subtitle}>{error}</Text>
          </View>
        )}
        {layouts.length > 0 &&
          thoughts.map((thought, i) => (
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
        <ThoughtDetailOverlay
          thought={selected}
          onClose={() => setSelected(null)}
          onDeleted={() => {
            setThoughts((prev) => prev.filter((t) => t.id !== selected.id));
            setSelected(null);
          }}
        />
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
  centered: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
