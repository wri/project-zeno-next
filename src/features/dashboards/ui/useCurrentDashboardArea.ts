"use client";

import useViewContextStore from "@/app/store/viewContextStore";
import { useDashboard } from "./dashboardQueries";

/** The current dashboard's AOI as the (source, src_id) pair the insights list
 *  scopes by. Null off a dashboard, or before the detail query resolves. */
export interface CurrentDashboardArea {
  aoiSource: string;
  aoiId: string;
}

/**
 * The AOI of the dashboard the viewer is currently on. A dashboard is scoped to
 * exactly one AOI, so the Analyses pane uses this to filter analyses to "this
 * area" without knowing anything about how dashboards are fetched.
 */
export function useCurrentDashboardArea(): CurrentDashboardArea | null {
  const viewContext = useViewContextStore((s) => s.viewContext);
  const dashboardId =
    viewContext?.page === "dashboard" ? viewContext.dashboard_id : "";
  const { data: dashboard } = useDashboard(dashboardId);
  const aoi = dashboard?.aois[0];
  return aoi ? { aoiSource: aoi.source, aoiId: aoi.src_id } : null;
}
