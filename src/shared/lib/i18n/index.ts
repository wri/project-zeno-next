/**
 * Public API of the shared i18n layer: react-i18next with ICU catalogs bundled
 * in `messages/` (en is the source), and one pure locale resolver used by the
 * UI and dictation.
 */
export {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_COOKIE,
  htmlLang,
  isLocale,
  matchLocale,
  resolveLocale,
  type Locale,
} from "./locale";
export { type MessageKey } from "./catalogs";
export { createI18n, i18n } from "./i18n";
export { applyLocale, browserLocaleInput, rememberLocale } from "./browser";
export { useLocale } from "./use-locale";
export { I18nextProvider, useTranslation } from "react-i18next";
