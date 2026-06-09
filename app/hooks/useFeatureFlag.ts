import { useState } from "react";
import { isFeatureEnabled } from "@/app/lib/feature-flags";

export function useFeatureFlag(flag: string): boolean {
  const [enabled] = useState(() =>
    isFeatureEnabled(new URLSearchParams(window.location.search), flag)
  );
  return enabled;
}
