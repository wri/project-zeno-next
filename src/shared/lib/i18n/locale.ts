/**
 * Pure UI-locale resolution. No React, no router, no `document`: callers pass
 * the profile code, the cookie string and the browser language list in.
 */

/** Same codes as the backend's `preferred_language_code`. */
export const LOCALES = ["en", "es", "fr", "pt", "id", "zh"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_COOKIE = "gnw_locale";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function isLocale(value: unknown): value is Locale {
  return LOCALES.some((locale) => locale === value);
}

/**
 * The shipped locale for a BCP-47 tag, or null. `pt` is Brazilian Portuguese
 * and serves every `pt-*` reader; `zh` is Simplified Chinese, so Traditional
 * tags (`zh-TW`, `zh-HK`, `zh-Hant*`) stay unmatched.
 */
export function matchLocale(tag: string | null | undefined): Locale | null {
  if (!tag) return null;
  const [language, ...rest] = tag.trim().toLowerCase().split(/[-_]/);
  if (language === "zh") return isSimplifiedChinese(rest) ? "zh" : null;
  return isLocale(language) ? language : null;
}

function isSimplifiedChinese(subtags: string[]): boolean {
  const [first] = subtags;
  if (first === undefined) return true;
  if (first === "hans") return true;
  if (first === "hant") return false;
  return first === "cn" || first === "sg";
}

/** The locale stored in a `document.cookie` string, ignoring bad values. */
function localeFromCookie(cookie: string | null | undefined): Locale | null {
  if (!cookie) return null;
  for (const part of cookie.split(";")) {
    const [name, ...value] = part.split("=");
    if (name.trim() !== LOCALE_COOKIE) continue;
    try {
      return matchLocale(decodeURIComponent(value.join("=").trim()));
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Signed-in profile, then the `gnw_locale` cookie, then the browser language
 * list, then English. Pass `profile` only for a signed-in user.
 */
export function resolveLocale(input: {
  profile?: string | null;
  cookie?: string | null;
  languages?: readonly string[] | null;
}): Locale {
  return (
    matchLocale(input.profile) ??
    localeFromCookie(input.cookie) ??
    input.languages?.map(matchLocale).find((locale) => locale !== null) ??
    DEFAULT_LOCALE
  );
}

/** The `<html lang>` tag for a locale; `zh` names its script for Han glyphs. */
export function htmlLang(locale: Locale): string {
  return locale === "zh" ? "zh-Hans" : locale;
}

export function localeCookieAssignment(locale: Locale): string {
  return `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax`;
}
