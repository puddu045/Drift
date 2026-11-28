import { PillGradient } from '@/components/PillGradient';
import { FlyingPlane } from '@/components/FlyingPlane';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { MoodId } from '@/theme';
import { UnwrittenWordmark } from '@/components/UnwrittenWordmark';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { getOwnProfile } from '@/features/profile/api';
import { useFonts, PlayfairDisplay_500Medium } from '@expo-google-fonts/playfair-display';
import { ScreenContainer } from '@/components/ScreenContainer';
import { useTranslation } from '@/i18n';
import { listNotifications } from '@/features/notifications/api';
import { listInteractions, listMyThoughts, listThoughts, Thought } from '@/features/thoughts/api';
import { ApiError } from '@/lib/api';
import { getCached, setCached } from '@/lib/prefetchCache';
import { PREFETCH_KEYS } from '@/lib/usePrefetchTabs';
import { colors, floatingTabBarSpace, radius, spacing, typography } from '@/theme';

import { ThoughtDetailOverlay } from './ThoughtDetailOverlay';

type Mode = 'world' | 'mine' | 'interactions';

function engagementLabel(thought: Thought, notified: boolean) {
  const label = thought._count ? `♡  ${thought._count.reactions}` : thought.mood;
  return notified ? label + '  /  New activity' : label;
}

const moodGradients: Record<MoodId, readonly [string, string, string]> = {
  love: ['#FFF5EE', '#F2DCE6', '#E7D8EC'], deep: ['#EEF0FF', '#DDDDF1', '#CDDDE9'],
  happy: ['#FFF9D9', '#FBE7BF', '#F7D5C4'], reflective: ['#EDF7F4', '#D4E9E4', '#DADFEF'],
  hopeful: ['#FFF4DC', '#F4E4F3', '#D4E6F9'], random: ['#EAF6FA', '#EFDBE8', '#FCE6D0'],
  lonely: ['#EDF0FA', '#DBE1EF', '#D6CFE6'], curious: ['#E0F5FF', '#DBE8F3', '#F6E2D4'],
};
const landscapes: Record<MoodId, number> = {
  love: require('../../../assets/unwritten-meadow.jpg'), hopeful: require('../../../assets/unwritten-meadow.jpg'),
  lonely: require('../../../assets/drift-sky-pastel.webp'), reflective: require('../../../assets/drift-sky-pastel.webp'),
  happy: require('../../../assets/drift-sky-day.webp'), curious: require('../../../assets/unwritten-meadow.jpg'),
  deep: require('../../../assets/drift-sky-day.webp'), random: require('../../../assets/drift-sky-pastel.webp'),
};

type ModeData = { thoughts: Thought[]; notifiedIds: Set<string> };

// "World" is warmed at launch by usePrefetchTabs; "mine"/"interactions"
// aren't (no point prefetching a mode you may never open), but once you've
// visited either in this session, switching back to it is instant too.
const MODE_CACHE_KEYS: Record<Mode, string> = {
  world: PREFETCH_KEYS.universeWorld,
  mine: 'universe:mine',
  interactions: 'universe:interactions',
};

export function UniverseScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<Mode>('world');
  const [name, setName] = useState('');
  const [fontsLoaded] = useFonts({ PlayfairDisplay_500Medium });
  const hour = new Date().getHours();
  const greeting = hour < 12 ? t('universe.greetingMorning') : hour < 18 ? t('universe.greetingAfternoon') : t('universe.greetingEvening');
  const MODES: { id: Mode; label: string }[] = [
    { id: 'world', label: t('universe.modeWorld') },
    { id: 'mine', label: t('universe.modeMine') },
    { id: 'interactions', label: t('universe.modeInteractions') },
  ];
  const SUBTITLES: Record<Mode, string> = {
    world: t('universe.subtitleWorld'),
    mine: t('universe.subtitleMine'),
    interactions: t('universe.subtitleInteractions'),
  };
  useFocusEffect(useCallback(() => {
    let active = true;
    getOwnProfile().then(profile => {
      if (active) setName(profile.displayName.trim().split(/\s+/)[0]);
    }).catch(() => {});
    return () => { active = false; };
  }, []));

  // One-shot signal from ComposeScreen ("?mode=mine" after posting) — apply
  // it, then clear it so it doesn't keep overriding a mode the user later
  // picks by hand.
  useFocusEffect(
    useCallback(() => {
      if (params.mode === 'world' || params.mode === 'mine' || params.mode === 'interactions') {
        setMode(params.mode);
        router.setParams({ mode: undefined });
      }
    }, [params.mode, router]),
  );
  const [selected, setSelected] = useState<Thought | null>(null);
  const initialData = getCached<ModeData>(MODE_CACHE_KEYS.world);
  const [thoughts, setThoughts] = useState<Thought[]>(() => initialData?.thoughts ?? []);
  const [notifiedIds, setNotifiedIds] = useState<Set<string>>(() => initialData?.notifiedIds ?? new Set());
  const [loading, setLoading] = useState(() => initialData === undefined);
  const [error, setError] = useState<string | null>(null);


  // Only "My Thoughts" pins notified bubbles to the top — World and My
  // Interactions keep the usual loosely-random placement.
  const ordered = useMemo(() => {
    if (mode !== 'mine' || notifiedIds.size === 0) return thoughts;
    const notified = thoughts.filter((t) => notifiedIds.has(t.id));
    const rest = thoughts.filter((t) => !notifiedIds.has(t.id));
    return [...notified, ...rest];
  }, [thoughts, notifiedIds, mode]);



  // Refetch whenever the Universe tab regains focus (e.g. after posting a new
  // thought from Create), and whenever the mode toggle changes.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const cacheKey = MODE_CACHE_KEYS[mode];
      const cached = getCached<ModeData>(cacheKey);
      if (cached) {
        // Show the last known data for this mode immediately instead of a
        // spinner, then still refresh in the background below.
        setThoughts(cached.thoughts);
        setNotifiedIds(cached.notifiedIds);
        setLoading(false);
      } else {
        setThoughts([]);
        setNotifiedIds(new Set());
        setLoading(true);
      }
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
          setCached(cacheKey, result);
        })
        .catch((err: unknown) => {
          if (!cancelled) setError(err instanceof ApiError ? err.message : t('universe.couldNotLoad'));
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
    <ScreenContainer edges={['top']} floatingTabBar background="none">
      <View style={styles.header}>
        <UnwrittenWordmark size={34} />
        <Text style={styles.title}>{greeting}{name ? ', ' + name : ''}</Text>
        <Text style={styles.subtitle}>{SUBTITLES[mode]}</Text>
      </View>

      <View style={styles.modeRow}>
        {MODES.map((m) => (
          <Pressable
            key={m.id}
            style={[styles.modePill, mode === m.id && styles.modePillActive]}
            onPress={() => setMode(m.id)}
          >
            {mode === m.id && <PillGradient />}
            <Text style={[styles.modeLabel, mode === m.id && styles.modeLabelActive]}>{m.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.field}>
        {loading && thoughts.length === 0 && (
          <View style={styles.centered}>
            <FlyingPlane />
            <Text accessibilityLiveRegion="polite" style={styles.subtitle}>
              {mode === 'world' ? t('universe.loadingWorld') : mode === 'mine' ? t('universe.loadingMine') : t('universe.loadingInteractions')}
            </Text>
          </View>
        )}
        {error && (
          <View style={styles.centered}>
            <Text style={styles.subtitle}>{error}</Text>
          </View>
        )}
        {!loading && !error && thoughts.length === 0 && (
          <View style={styles.centered}>
            {mode === 'mine' && <FlyingPlane />}
            <Text style={styles.subtitle}>
              {mode === 'mine'
                ? t('universe.emptyMine')
                : mode === 'interactions'
                  ? t('universe.emptyInteractions')
                  : t('universe.emptyWorld')}
            </Text>
          </View>
        )}
        <ScrollView contentContainerStyle={styles.feed}>
          {ordered[0] && (
            <Pressable style={styles.featureFrame} accessibilityRole="button" onPress={() => setSelected(ordered[0])}>
              <ImageBackground source={landscapes[ordered[0].mood]} style={styles.feature}>
                <Text style={[styles.quote, fontsLoaded && { fontFamily: 'PlayfairDisplay_500Medium' }]}>&ldquo;{ordered[0].text}&rdquo;</Text>
                <Text style={styles.caption}>{engagementLabel(ordered[0], notifiedIds.has(ordered[0].id))}</Text>
              </ImageBackground>
            </Pressable>
          )}
          <View style={styles.grid}>
            {ordered.slice(1).map(thought => (
              <Pressable key={thought.id} accessibilityRole="button" onPress={() => setSelected(thought)}
                style={styles.tile}>
                <LinearGradient pointerEvents="none" colors={moodGradients[thought.mood]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 22 }]} />
                <Text numberOfLines={5} style={styles.tileText}>{thought.text}</Text>
                <Text style={styles.caption}>{engagementLabel(thought, notifiedIds.has(thought.id))}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>

      {mode === 'mine' && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('universe.createThought')}
          onPress={() => router.navigate('/(tabs)/create')}
          style={styles.fab}
        >
          <PillGradient tone="brand" />
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </Pressable>
      )}

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
  feed: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  featureFrame: { borderRadius: 22, boxShadow: '0px 3px 10px rgba(35,42,68,0.14)' },
  feature: { minHeight: 205, padding: 26, borderRadius: 22, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', gap: 12 },
  quote: { color: '#131D39', fontSize: 16, lineHeight: 23, textAlign: 'center', letterSpacing: -0.35 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { boxShadow: '0px 3px 8px rgba(35,42,68,0.12)', width: '48%', minHeight: 125, borderRadius: 22, padding: 16, justifyContent: 'space-between', gap: 12 },
  tileText: { color: colors.textPrimary, fontSize: 16, lineHeight: 21 },
  caption: { color: colors.textPrimary, fontSize: 12, textTransform: 'capitalize' },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  title: {
    fontFamily: typography.fontFamily,
    marginTop: 18,
    fontSize: 23,
    letterSpacing: -0.5,
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
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    alignItems: 'center',
  },
  modePillActive: {
    borderColor: '#294D72',
    backgroundColor: '#204B76',
    shadowColor: colors.accent,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  modeLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
    color: colors.textSecondary,
  },
  modeLabelActive: {
    color: '#FFFFFF',
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
  fab: {
    position: 'absolute',
    right: spacing.lg,
    // Absolute positioning here is relative to the screen's full height,
    // not the content box shrunk by floatingTabBar's paddingBottom — so this
    // needs the tab bar's own reserved space plus a visible gap above it,
    // or the FAB sits low enough to render under/behind the tab bar.
    bottom: floatingTabBarSpace + spacing.sm,
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.textPrimary,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
