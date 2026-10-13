/**
 * Framework-agnostic locale resolution for the PZB-229 spike.
 *
 * Cookie + in-memory state only. This module does not import React, the
 * router, or any Next.js API, so a Vite (or other) mount can keep it as-is.
 */

export const LOCALES = ["en", "pt-BR", "zh-Hans"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** Readable by any host. Not a path prefix and not a router concern. */
export const LOCALE_COOKIE = "gnw_locale";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function isLocale(value: string | null | undefined): value is Locale {
  return LOCALES.some((locale) => locale === value);
}

/**
 * Map a BCP-47 tag onto a catalog we actually ship.
 * `zh-TW` / `zh-Hant` stay unmatched — those are Traditional Chinese.
 */
export function matchLocale(tag: string | null | undefined): Locale | null {
  if (!tag) return null;
  const lower = tag.trim().toLowerCase().replace(/_/g, "-");
  if (
    lower === "zh" ||
    lower === "zh-hans" ||
    lower === "zh-cn" ||
    lower === "zh-sg"
  ) {
    return "zh-Hans";
  }
  // Only Brazilian Portuguese ships; pt-PT readers get it rather than English.
  if (lower === "pt" || lower.startsWith("pt-")) return "pt-BR";
  if (lower.startsWith("en")) return "en";
  return null;
}

/** Pure parser for a `document.cookie` or `Cookie` header string. */
export function localeFromCookieHeader(
  cookie: string | null | undefined
): Locale | null {
  if (!cookie) return null;
  for (const part of cookie.split(";")) {
    const [rawName, ...rest] = part.split("=");
    if (rawName?.trim() !== LOCALE_COOKIE) continue;
    return matchLocale(decodeURIComponent(rest.join("=").trim()));
  }
  return null;
}

export function localeFromLanguages(
  languages: readonly string[] | null | undefined
): Locale | null {
  if (!languages) return null;
  for (const tag of languages) {
    const match = matchLocale(tag);
    if (match) return match;
  }
  return null;
}

export function resolveLocale(input: {
  explicit?: string | null;
  cookie?: string | null;
  languages?: readonly string[] | null;
}): Locale {
  return (
    matchLocale(input.explicit) ??
    localeFromCookieHeader(input.cookie) ??
    localeFromLanguages(input.languages) ??
    DEFAULT_LOCALE
  );
}

export function localeCookieAssignment(locale: Locale): string {
  return `${LOCALE_COOKIE}=${encodeURIComponent(locale)}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax`;
}

type Listener = () => void;

let current: Locale = DEFAULT_LOCALE;
const listeners = new Set<Listener>();

export function getLocale(): Locale {
  return current;
}

export function subscribeLocale(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emit(): void {
  for (const listener of listeners) listener();
}

/** Persist an explicit choice. Does not touch the URL. */
export function setLocale(locale: Locale): void {
  current = locale;
  if (typeof document !== "undefined") {
    document.cookie = localeCookieAssignment(locale);
  }
  emit();
}

/**
 * Read the cookie, then the browser language list. Safe to call only in the
 * browser; module scope never touches `document` (prerender stays clean).
 */
export function initLocaleFromBrowser(): Locale {
  const cookie = typeof document === "undefined" ? null : document.cookie;
  const languages =
    typeof navigator === "undefined"
      ? null
      : navigator.languages?.length
        ? navigator.languages
        : [navigator.language];
  current = resolveLocale({ cookie, languages });
  emit();
  return current;
}
