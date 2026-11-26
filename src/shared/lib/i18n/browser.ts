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
 * After a profile save: when the preferred language changed, drop this
 * device's display choice so the UI follows it at once, or nothing would
 * visibly change after saving (PZB-1722).
 */
export function followPreferredLocale(
  before: string | null,
  after: string | null
): void {
  const next = matchLocale(after);
  if (next === matchLocale(before)) return;
  document.cookie = localeCookieRemoval();
  applyLocale(next ?? DEFAULT_LOCALE);
}
