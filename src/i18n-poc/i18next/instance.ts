import i18next, { type i18n as I18nInstance } from "i18next";
import ICU from "i18next-icu";
import { initReactI18next } from "react-i18next";
import { catalogs, type MessageId, type Translate } from "../catalog";
import { DEFAULT_LOCALE, type Locale } from "../locale";

function resources() {
  return {
    en: { translation: catalogs.en },
    "pt-BR": { translation: catalogs["pt-BR"] },
    "zh-Hans": { translation: catalogs["zh-Hans"] },
  };
}

/**
 * One i18next instance per call so tests don't share language state.
 * `keySeparator: false` keeps the flat ICU catalog keys (`assistant.label`).
 */
export function createI18next(locale: Locale = DEFAULT_LOCALE): I18nInstance {
  const instance = i18next.createInstance();
  instance.use(ICU).use(initReactI18next);
  void instance.init({
    lng: locale,
    fallbackLng: false,
    keySeparator: false,
    nsSeparator: false,
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
    resources: resources(),
  });
  return instance;
}

export function translateWith(
  instance: I18nInstance,
  locale?: Locale
): Translate {
  return (id: MessageId, values) => {
    if (locale && instance.language !== locale) {
      instance.changeLanguage(locale);
    }
    return instance.t(id, values);
  };
}
