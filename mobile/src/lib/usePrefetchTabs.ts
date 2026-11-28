import { useEffect } from 'react';

import { preloadInbox } from '@/features/connections/preload';
import { preloadDestiny } from '@/features/destiny/preload';
import { listThoughts } from '@/features/thoughts/api';

import { setCached } from './prefetchCache';

export const PREFETCH_KEYS = {
  universeWorld: 'universe:world',
} as const;

/**
 * Warms each tab's first-load data right after sign-in, so switching to a
 * tab you haven't visited yet this session can render immediately from
 * cache instead of a blank/spinner state — each screen still does its own
 * normal fetch afterward (on mount or focus, as it already did) to keep
 * data fresh; this only seeds the first paint. Best-effort: a failure here
 * is silently ignored, since the screen's own fetch will show its own
 * error state if something's genuinely wrong.
 */
export function usePrefetchTabs(userId?: string) {
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    listThoughts()
      .then((result) => {
        // Shape matches UniverseScreen's per-mode cache (ModeData) — "World"
        // has no notified-reply tracking, unlike "My Thoughts".
        if (!cancelled) {
          setCached(PREFETCH_KEYS.universeWorld, { thoughts: result.thoughts, notifiedIds: new Set<string>() });
        }
      })
      .catch(() => {});

    void preloadDestiny(userId).catch(() => {});

    void preloadInbox(userId).catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [userId]);
}
