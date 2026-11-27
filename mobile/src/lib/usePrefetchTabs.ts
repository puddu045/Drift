import { useEffect } from 'react';

import { listConnections, listIncomingRequests } from '@/features/connections/api';
import { getTodayDestiny } from '@/features/destiny/api';
import { listThoughts } from '@/features/thoughts/api';

import { setCached } from './prefetchCache';

export const PREFETCH_KEYS = {
  destinyToday: 'destiny:today',
  universeWorld: 'universe:world',
  connectionsRequests: 'connections:requests',
  connectionsList: 'connections:list',
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
export function usePrefetchTabs(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    listThoughts()
      .then((result) => {
        if (!cancelled) setCached(PREFETCH_KEYS.universeWorld, result.thoughts);
      })
      .catch(() => {});

    getTodayDestiny()
      .then((thought) => {
        if (!cancelled) setCached(PREFETCH_KEYS.destinyToday, thought);
      })
      .catch(() => {});

    Promise.all([listIncomingRequests(), listConnections()])
      .then(([requests, connections]) => {
        if (!cancelled) {
          setCached(PREFETCH_KEYS.connectionsRequests, requests);
          setCached(PREFETCH_KEYS.connectionsList, connections);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [enabled]);
}
