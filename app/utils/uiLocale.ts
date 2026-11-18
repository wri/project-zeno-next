import { resolveLocale, type Locale } from "@/src/shared/lib/i18n";

// Prerendered at build time in English; they are not localised in phase 1.
const ENGLISH_ONLY_PATHS = new Set(["/", "/amazonia"]);

/** The UI locale for a page: English on the landing pages, else resolved. */
export function uiLocale(
  pathname: string,
  input: Parameters<typeof resolveLocale>[0]
): Locale {
  const path = pathname.replace(/(.)\/$/, "$1");
  return ENGLISH_ONLY_PATHS.has(path) ? "en" : resolveLocale(input);
}
