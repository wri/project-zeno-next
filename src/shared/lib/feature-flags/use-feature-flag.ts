import { useState } from "react";
import { isFeatureEnabled } from "./feature-flags";

export function useFeatureFlag(flag: string): boolean {
  const [enabled] = useState(() =>
    // Flags are read from the URL, which only exists client-side; during SSR
    // every flag is off. Callers must not branch server-rendered DOM on the
    // flag (hydration mismatch) — render-null or client-only components only.
    typeof window === "undefined"
      ? false
      : isFeatureEnabled(new URLSearchParams(window.location.search), flag)
  );
  return enabled;
}
