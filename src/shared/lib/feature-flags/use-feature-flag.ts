import { useState } from "react";
import { enabledFlags, isFeatureEnabled, withFlags } from "./feature-flags";

// Flags are read from the URL once, on mount, so they only work in the
// browser: don't use them on pages that are rendered at build time.
const searchParams = () => new URLSearchParams(window.location.search);

export function useFeatureFlag(flag: string): boolean {
  const [enabled] = useState(() => isFeatureEnabled(searchParams(), flag));
  return enabled;
}

/**
 * Every flag opted into by the URL. Use when gating a collection whose flags
 * aren't known at call time — one hook call covers all of them, where
 * `useFeatureFlag` would need one call per flag.
 *
 * Returned as a ReadonlySet: the set lives in React state, so mutating it
 * would neither trigger a re-render nor survive as intended.
 */
export function useEnabledFlags(): ReadonlySet<string> {
  const [flags] = useState(() => enabledFlags(searchParams()));
  return flags;
}

/** `href` with the flags this page was opened with; see {@link withFlags}. */
export function useWithFlags(): (href: string) => string {
  const [params] = useState(searchParams);
  return (href) => withFlags(href, params);
}
