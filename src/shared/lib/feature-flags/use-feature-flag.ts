import { useState } from "react";
import { enabledFlags, isFeatureEnabled } from "./feature-flags";

// Flags are read from the URL, which only exists client-side; during SSR every
// flag is off. Callers must not branch server-rendered DOM on a flag
// (hydration mismatch) — render-null or client-only components only.
const searchParams = () =>
  typeof window === "undefined"
    ? null
    : new URLSearchParams(window.location.search);

export function useFeatureFlag(flag: string): boolean {
  const [enabled] = useState(() => {
    const params = searchParams();
    return params ? isFeatureEnabled(params, flag) : false;
  });
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
  const [flags] = useState(() => {
    const params = searchParams();
    return params ? enabledFlags(params) : new Set<string>();
  });
  return flags;
}
