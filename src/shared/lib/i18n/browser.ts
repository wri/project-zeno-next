import { i18n } from "./i18n";
import {
  DEFAULT_LOCALE,
  htmlLang,
  localeCookieAssignment,
  localeCookieRemoval,
  matchLocale,
  type Locale,
} from "./locale";

// Browser-only: call from effects and event handlers, never while rendering
// (the landing pages are prerendered in Node).

/** Switch the UI to `locale` and keep `<html lang>` in step. */
export function applyLocale(locale: Locale): void {
  void i18n.changeLanguage(locale);
  document.documentElement.lang = htmlLang(locale);
}

/** Remember this device's display language in the `gnw_locale` cookie. */
export function rememberLocale(locale: Locale): void {
  document.cookie = localeCookieAssignment(locale);
}

/**
 * A preferred language was just saved (user settings, onboarding): drop this
 * device's display choice so the UI follows the new preference at once.
 */
export function adoptPreferredLocale(code: string | null | undefined): void {
  document.cookie = localeCookieRemoval();
  applyLocale(matchLocale(code) ?? DEFAULT_LOCALE);
}
