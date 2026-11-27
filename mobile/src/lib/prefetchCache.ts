// A tiny in-memory, session-lifetime cache so a tab's first visit can render
// with the previous launch's data immediately instead of a blank/spinner
// state, while the screen's own fetch (on mount or focus, as it already
// does) quietly refreshes it in the background. Deliberately not persisted
// across app restarts or shared via context — this is just a seam between
// usePrefetchTabs (which warms it right after sign-in) and each screen's
// own initial state.
const cache = new Map<string, unknown>();

export function getCached<T>(key: string): T | undefined {
  return cache.get(key) as T | undefined;
}

export function setCached<T>(key: string, value: T): void {
  cache.set(key, value);
}
