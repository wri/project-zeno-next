import { useEffect, useState } from "react";
import type { Locale } from "./locale";

/**
 * Simplified-Chinese face, loaded only when a zh-Hans screen asks for it.
 * Fontsource has no IBM Plex Sans SC package; Noto Sans SC is the same
 * CSS-import pipeline the app already uses for IBM Plex Sans.
 *
 * `chinese-simplified-400.css` is one ~1.1 MB woff2 (weight 700 is another).
 * The follow-on font ticket should prefer unicode-range slices over shipping
 * that file on every session.
 */
const CJK_STYLES = [
  () => import("@fontsource/noto-sans-sc/chinese-simplified-400.css"),
  () => import("@fontsource/noto-sans-sc/chinese-simplified-700.css"),
];

export const CJK_FONT_FAMILY = "Noto Sans SC";

/** Latin stays on IBM Plex; Han falls through because Plex has no CJK glyphs. */
export function fontStack(cjk: boolean): string {
  return cjk
    ? `'IBM Plex Sans', '${CJK_FONT_FAMILY}', sans-serif`
    : "'IBM Plex Sans', sans-serif";
}

export function useCjkFont(locale: Locale, enabled: boolean): boolean {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (locale !== "zh-Hans" || !enabled) return;
    let cancelled = false;
    void Promise.all(CJK_STYLES.map((load) => load())).then(() => {
      if (!cancelled) setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [locale, enabled]);

  return locale === "zh-Hans" && enabled && loaded;
}
