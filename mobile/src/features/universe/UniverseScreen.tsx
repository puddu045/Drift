import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { ScreenContainer } from '@/components/ScreenContainer';
import { listNotifications } from '@/features/notifications/api';
import { listInteractions, listMyThoughts, listThoughts, Thought } from '@/features/thoughts/api';
import { ApiError } from '@/lib/api';
import { colors, radius, spacing, typography } from '@/theme';

import { Bubble } from './Bubble';
import { OrbitTrails } from './OrbitTrails';
import { ThoughtDetailOverlay } from './ThoughtDetailOverlay';
import { useBubbleLayout } from './useBubbleLayout';
import { useReducedMotion } from './useReducedMotion';

type Mode = 'world' | 'mine' | 'interactions';

const MODES: { id: Mode; label: string }[] = [
  { id: 'world', label: 'World' },
  { id: 'mine', label: 'My Thoughts' },
  { id: 'interactions', label: 'My Interactions' },
];

const SUBTITLES: Record<Mode, string> = {
  world: 'Somewhere, someone feels the same.',
  mine: 'Everything you’ve set adrift.',
  interactions: 'Thoughts you’ve connected with.',
};

export function UniverseScreen() {
  const [mode, setMode] = useState<Mode>('world');
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [selected, setSelected] = useState<Thought | null>(null);
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [notifiedIds, setNotifiedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();

  // Only "My Thoughts" pins notified bubbles to the top — World and My
  // Interactions keep the usual loosely-random placement.
  const ordered = useMemo(() => {
    if (mode !== 'mine' || notifiedIds.size === 0) return thoughts;
    const notified = thoughts.filter((t) => notifiedIds.has(t.id));
    const rest = thoughts.filter((t) => !notifiedIds.has(t.id));
    return [...notified, ...rest];
  }, [thoughts, notifiedIds, mode]);

  const layouts = useBubbleLayout(ordered.length, size.width, size.height, mode === 'mine' ? notifiedIds.size : 0);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize({ width, height });
  }, []);

  // Refetch whenever the Universe tab regains focus (e.g. after posting a new
  // thought from Create), and whenever the mode toggle changes.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      setError(null);

      const load = async () => {
        if (mode === 'world') {
          const result = await listThoughts();
          return { thoughts: result.thoughts, notifiedIds: new Set<string>() };
        }
        if (mode === 'interactions') {
          const result = await listInteractions();
          return { thoughts: result, notifiedIds: new Set<string>() };
        }
        const [mine, notifications] = await Promise.all([listMyThoughts(), listNotifications()]);
        const ids = new Set<string>();
        for (const n of notifications) {
          if (
            (n.type === 'reaction' || n.type === 'reply') &&
            !n.readAt &&
            typeof n.payload.thoughtId === 'string'
          ) {
            ids.add(n.payload.thoughtId);
          }
        }
        return { thoughts: mine, notifiedIds: ids };
      };

      load()
        .then((result) => {
          if (cancelled) return;
          setThoughts(result.thoughts);
          setNotifiedIds(result.notifiedIds);
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
    }, [mode]),
  );

  return (
    <ScreenContainer edges={['top']} floatingTabBar>
      <View style={styles.header}>
        <Text style={styles.title}>Universe</Text>
        <Text style={styles.subtitle}>{SUBTITLES[mode]}</Text>
      </View>

      <View style={styles.modeRow}>
        {MODES.map((m) => (
          <Pressable
            key={m.id}
            style={[styles.modePill, mode === m.id && styles.modePillActive]}
            onPress={() => setMode(m.id)}
          >
            <Text style={[styles.modeLabel, mode === m.id && styles.modeLabelActive]}>{m.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.field} onLayout={onLayout}>
        <OrbitTrails width={size.width} height={size.height} />
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
            <Text style={styles.subtitle}>
              {mode === 'mine'
                ? 'You haven’t posted anything yet.'
                : mode === 'interactions'
                  ? 'Nothing here yet — react or reply to a thought to see it.'
                  : 'Nothing to see yet. Check back soon.'}
            </Text>
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
              hasNotification={mode === 'mine' && notifiedIds.has(thought.id)}
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
  modeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  modePill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    alignItems: 'center',
  },
  modePillActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    shadowColor: colors.accent,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  modeLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
    color: colors.textSecondary,
  },
  modeLabelActive: {
    color: colors.textPrimary,
    fontWeight: typography.weight.semibold,
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
    paddingHorizontal: spacing.xl,
  },
});
