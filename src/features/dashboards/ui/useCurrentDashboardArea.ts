import useAuthStore from "@/app/store/authStore";
import useViewContextStore from "@/app/store/viewContextStore";
import type { Dashboard } from "../api/schemas";
import { useDashboard } from "./dashboardQueries";

/**
 * The dashboard the viewer is currently on, and whether they own it (every
 * write to it is owner-only). `dashboard` is null off a dashboard, or before
 * the detail query resolves.
 */
export function useCurrentDashboard(): {
  dashboard: Dashboard | null;
  isOwner: boolean;
} {
  const viewContext = useViewContextStore((s) => s.viewContext);
  const dashboardId =
    viewContext?.page === "dashboard" ? viewContext.dashboard_id : "";
  const { data: dashboard } = useDashboard(dashboardId);
  const userId = useAuthStore((s) => s.userId);
  return {
    dashboard: dashboard ?? null,
    isOwner: !!userId && userId === dashboard?.user_id,
  };
}

/**
 * The current dashboard's AOI. `aoiSource`/`aoiId` are the (source, src_id)
 * pair the insights list scopes by; `subtype` and `name` complete the identity
 * the analytics API and the "{dataset} in {area}" title need. Null off a
 * dashboard, or before the detail query resolves.
 */
export interface CurrentDashboardArea {
  aoiSource: string;
  aoiId: string;
  subtype: string;
  name: string;
}

/**
 * The AOI of the dashboard the viewer is currently on. A dashboard is scoped to
 * exactly one AOI, so the Analyses pane uses this to filter analyses to "this
 * area" and to run curated analyses for it, without knowing anything about how
 * dashboards are fetched.
 */
export function useCurrentDashboardArea(): CurrentDashboardArea | null {
  const aoi = useCurrentDashboard().dashboard?.aois[0];
  return aoi
    ? {
        aoiSource: aoi.source,
        aoiId: aoi.src_id,
        subtype: aoi.subtype,
        name: aoi.name,
      }
    : null;
}
