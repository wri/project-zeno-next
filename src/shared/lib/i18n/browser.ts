import { i18n } from "./i18n";
import { htmlLang, localeCookieAssignment, type Locale } from "./locale";

// Browser-only: call from effects and event handlers, never while rendering
// (the landing pages are prerendered in Node).

/** The cookie `resolveLocale` reads in the browser. */
export function browserLocaleInput() {
  return { cookie: document.cookie };
}

/** Switch the UI to `locale` and keep `<html lang>` in step. */
export function applyLocale(locale: Locale): void {
  void i18n.changeLanguage(locale);
  document.documentElement.lang = htmlLang(locale);
}

/** Remember an explicit choice in the `gnw_locale` cookie. */
export function rememberLocale(locale: Locale): void {
  document.cookie = localeCookieAssignment(locale);
}
