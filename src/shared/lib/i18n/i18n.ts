import i18next, { type i18n as I18n } from "i18next";
import ICU from "i18next-icu";
import { initReactI18next } from "react-i18next";
import { catalogs } from "./catalogs";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "./locale";

/**
 * A ready i18next instance with every catalog bundled (nothing is fetched).
 * Keys are flat (`chat.input.send`), so the key separator is off; messages are
 * ICU, and a key missing from a locale renders the English text.
 */
export function createI18n(locale: Locale = DEFAULT_LOCALE): I18n {
  const instance = i18next.createInstance();
  instance.use(ICU).use(initReactI18next);
  // Synchronous: resources are inline and no backend plugin is registered.
  void instance.init({
    lng: locale,
    supportedLngs: [...LOCALES],
    fallbackLng: DEFAULT_LOCALE,
    keySeparator: false,
    nsSeparator: false,
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
    resources: Object.fromEntries(
      LOCALES.map((l) => [l, { translation: catalogs[l] }])
    ),
  });
  return instance;
}

/** The app's instance. Starts in English; the locale sync switches it. */
export const i18n = createI18n();
