import { createContext, PropsWithChildren, useContext, useMemo, useSyncExternalStore } from 'react';

import { TRANSLATIONS, TranslationKey } from './index';
import { getLocale, subscribeLocale } from './localeStore';
import { SupportedUiLocale } from './supportedLocales';

type LocaleContextValue = {
  locale: SupportedUiLocale;
  t: (key: TranslationKey) => string;
};

const LocaleContext = createContext<LocaleContextValue>({
  locale: 'en',
  t: (key) => TRANSLATIONS.en[key] ?? key,
});

/**
 * Drives the app's own UI language from the same "default translation
 * language" the user sets in Profile — one setting for both content
 * translation and app chrome. The actual locale lives in localeStore (set
 * once the profile loads, and again whenever ProfileScreen's language
 * picker changes it) so every screen under this provider re-renders in the
 * new language immediately, with no app restart.
 */
export function LocaleProvider({ children }: PropsWithChildren) {
  const locale = useSyncExternalStore(subscribeLocale, getLocale);

  const value = useMemo<LocaleContextValue>(() => {
    const strings = TRANSLATIONS[locale] ?? TRANSLATIONS.en;
    return {
      locale,
      t: (key) => strings[key] ?? TRANSLATIONS.en[key] ?? key,
    };
  }, [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useTranslation() {
  return useContext(LocaleContext);
}
