import en from './locales/en.json';
import es from './locales/es.json';
import pt from './locales/pt.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import it from './locales/it.json';
import nl from './locales/nl.json';
import pl from './locales/pl.json';
import sv from './locales/sv.json';
import el from './locales/el.json';
import tr from './locales/tr.json';
import ru from './locales/ru.json';
import uk from './locales/uk.json';
import hi from './locales/hi.json';
import bn from './locales/bn.json';
import pa from './locales/pa.json';
import gu from './locales/gu.json';
import mr from './locales/mr.json';
import ta from './locales/ta.json';
import te from './locales/te.json';
import kn from './locales/kn.json';
import ml from './locales/ml.json';
import th from './locales/th.json';
import vi from './locales/vi.json';
import id from './locales/id.json';
import ms from './locales/ms.json';
import tl from './locales/tl.json';
import ko from './locales/ko.json';
import ja from './locales/ja.json';
import zhCN from './locales/zh-CN.json';
import zhTW from './locales/zh-TW.json';
import sw from './locales/sw.json';

import { SupportedUiLocale } from './supportedLocales';

export type TranslationKey = keyof typeof en;

export const TRANSLATIONS: Record<SupportedUiLocale, Record<string, string>> = {
  en,
  es,
  pt,
  fr,
  de,
  it,
  nl,
  pl,
  sv,
  el,
  tr,
  ru,
  uk,
  hi,
  bn,
  pa,
  gu,
  mr,
  ta,
  te,
  kn,
  ml,
  th,
  vi,
  id,
  ms,
  tl,
  ko,
  ja,
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  sw,
};

export { SUPPORTED_UI_LOCALES, resolveUiLocale } from './supportedLocales';
export type { SupportedUiLocale } from './supportedLocales';
export { LocaleProvider, useTranslation } from './LocaleProvider';
