import { useTranslation } from "react-i18next";
import { DEFAULT_LOCALE, isLocale, type Locale } from "./locale";

/** The active UI locale; re-renders when it changes. */
export function useLocale(): Locale {
  const { i18n } = useTranslation();
  return isLocale(i18n.language) ? i18n.language : DEFAULT_LOCALE;
}
