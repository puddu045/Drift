import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { ScreenContainer } from '@/components/ScreenContainer';
import { listNotifications } from '@/features/notifications/api';
import { listMyThoughts, Thought } from '@/features/thoughts/api';
import { ApiError } from '@/lib/api';
import { colors, spacing, typography } from '@/theme';

import { Bubble } from './Bubble';
import { ThoughtDetailOverlay } from './ThoughtDetailOverlay';
import { useBubbleLayout } from './useBubbleLayout';
import { useReducedMotion } from './useReducedMotion';

export function MyThoughtsScreen() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [selected, setSelected] = useState<Thought | null>(null);
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [notifiedIds, setNotifiedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();

  // Thoughts with an unseen reaction/reply float to the top of the field;
  // everything else keeps its usual loosely-random placement.
  const ordered = useMemo(() => {
    const notified = thoughts.filter((t) => notifiedIds.has(t.id));
    const rest = thoughts.filter((t) => !notifiedIds.has(t.id));
    return [...notified, ...rest];
  }, [thoughts, notifiedIds]);

  const layouts = useBubbleLayout(ordered.length, size.width, size.height, notifiedIds.size);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize({ width, height });
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      Promise.all([listMyThoughts(), listNotifications()])
        .then(([myThoughts, notifications]) => {
          if (cancelled) return;
          setThoughts(myThoughts);
          const ids = new Set<string>();
          for (const n of notifications) {
            if ((n.type === 'reaction' || n.type === 'reply') && !n.readAt && typeof n.payload.thoughtId === 'string') {
              ids.add(n.payload.thoughtId);
            }
          }
          setNotifiedIds(ids);
        })
        .catch((err: unknown) => {
          if (!cancelled) setError(err instanceof ApiError ? err.message : 'Could not load your thoughts.');
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
        <Text style={styles.title}>My Thoughts</Text>
        <Text style={styles.subtitle}>Everything you&rsquo;ve set adrift.</Text>
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
        {!loading && !error && thoughts.length === 0 && (
          <View style={styles.centered}>
            <Text style={styles.subtitle}>You haven&rsquo;t posted anything yet.</Text>
          </View>
        )}
        {layouts.length > 0 &&
          ordered.map((thought, i) => (
            <Bubble
              key={thought.id}
              thought={thought}
              layout={layouts[i]}
              reduceMotion={reduceMotion}
              paused={selected?.id === thought.id}
              onPress={() => setSelected(thought)}
              hasNotification={notifiedIds.has(thought.id)}
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
