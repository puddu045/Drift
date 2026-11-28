// The subset of profile/languages.ts LANGUAGES codes we currently ship real
// app-UI translations for. RTL languages (Arabic, Hebrew, Persian, Urdu) are
// deliberately excluded here — they need layout mirroring, not just text,
// which is a separate follow-up. Users with an RTL preferredLanguage fall
// back to English UI (their content-translation feature is unaffected,
// since that's a separate server-side mechanism).
export const SUPPORTED_UI_LOCALES = [
  'en',
  'es',
  'pt',
  'fr',
  'de',
  'it',
  'nl',
  'pl',
  'sv',
  'el',
  'tr',
  'ru',
  'uk',
  'hi',
  'bn',
  'pa',
  'gu',
  'mr',
  'ta',
  'te',
  'kn',
  'ml',
  'th',
  'vi',
  'id',
  'ms',
  'tl',
  'ko',
  'ja',
  'zh-CN',
  'zh-TW',
  'sw',
] as const;

export type SupportedUiLocale = (typeof SUPPORTED_UI_LOCALES)[number];

export function resolveUiLocale(preferredLanguage: string | null | undefined): SupportedUiLocale {
  if (preferredLanguage && (SUPPORTED_UI_LOCALES as readonly string[]).includes(preferredLanguage)) {
    return preferredLanguage as SupportedUiLocale;
  }
  return 'en';
}
