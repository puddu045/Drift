import { resolveUiLocale, SupportedUiLocale } from './supportedLocales';

// A tiny external store (outside React) so the app's UI language can be
// read reactively by LocaleProvider while being set from anywhere —
// ProfileScreen's language picker, or the profile fetch that first learns
// the user's saved preference — without prop drilling or a context
// round-trip. Session-lifetime only, same as prefetchCache.
type Listener = () => void;

let currentLocale: SupportedUiLocale = 'en';
const listeners = new Set<Listener>();

export function getLocale(): SupportedUiLocale {
  return currentLocale;
}

export function setPreferredLanguage(preferredLanguage: string | null | undefined): void {
  const next = resolveUiLocale(preferredLanguage);
  if (next === currentLocale) return;
  currentLocale = next;
  listeners.forEach((listener) => listener());
}

export function subscribeLocale(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
