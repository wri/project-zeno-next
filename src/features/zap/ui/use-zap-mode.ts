import { usePathname } from "@/app/lib/router";
import { isAppRoute } from "@/app/utils/threadNavigation";
import { useFeatureFlag } from "@/src/shared/lib/feature-flags";

import useZapStore from "../model/zap-store";

/** Zap mode is hidden until the user opts in with `?ff=zap`. */
export const ZAP_FEATURE_FLAG = "zap";

/**
 * Whether zap mode can be offered (`available`: the flag is on and the map
 * is open) and whether it is on (`active`). Without the flag, a mode stored
 * in an earlier session is ignored, so nobody is left in zap mode.
 */
export function useZapMode(): { available: boolean; active: boolean } {
  const enabled = useFeatureFlag(ZAP_FEATURE_FLAG);
  const pathname = usePathname();
  const mode = useZapStore((s) => s.mode);
  const available = enabled && isAppRoute(pathname);
  return { available, active: available && mode === "zap" };
}
