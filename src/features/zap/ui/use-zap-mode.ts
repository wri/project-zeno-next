import { usePathname } from "@/app/lib/router";
import useAuthStore from "@/app/store/authStore";
import {
  isAppRoute,
  isDashboardDetailRoute,
} from "@/app/utils/threadNavigation";
// A deep import, not the dashboards barrel: the barrel exports the dashboard
// page, which mounts the chat panel, which uses this hook.
import { useDashboard } from "@/src/features/dashboards/ui/dashboardQueries";
import { useFeatureFlag } from "@/src/shared/lib/feature-flags";

import useZapStore from "../model/zap-store";

/** Zap mode is hidden until the user opts in with `?ff=zap`. */
export const ZAP_FEATURE_FLAG = "zap";

export interface ZapModeState {
  /** The flag is on, and the page is the map or a dashboard the user owns. */
  available: boolean;
  /** Zap mode is available and on. */
  active: boolean;
  /** The dashboard that zap edits; null on the map. */
  dashboardId: string | null;
}

/** The id of the dashboard of a `/dashboards/<id>` path, else null. */
function dashboardIdOf(pathname: string | null): string | null {
  if (!isDashboardDetailRoute(pathname)) return null;
  return pathname!.split("/")[2] || null;
}

/** True when the signed-in user owns the dashboard. Only the owner can edit. */
function useOwnsDashboard(dashboardId: string | null): boolean {
  const userId = useAuthStore((s) => s.userId);
  // Disabled, with no fetch, when the id is "".
  const { data: dashboard } = useDashboard(dashboardId ?? "");
  return !!userId && !!dashboard && dashboard.user_id === userId;
}

/**
 * Whether zap mode can be offered and whether it is on. Zap works on the map
 * and on a dashboard that the user owns. Without the flag, a mode stored in
 * an earlier session is ignored, so nobody is left in zap mode.
 */
export function useZapMode(): ZapModeState {
  const enabled = useFeatureFlag(ZAP_FEATURE_FLAG);
  const pathname = usePathname();
  const mode = useZapStore((s) => s.mode);
  const pageDashboardId = enabled ? dashboardIdOf(pathname) : null;
  const owner = useOwnsDashboard(pageDashboardId);
  const dashboardId = owner ? pageDashboardId : null;
  const available = enabled && (isAppRoute(pathname) || dashboardId !== null);
  return { available, active: available && mode === "zap", dashboardId };
}
