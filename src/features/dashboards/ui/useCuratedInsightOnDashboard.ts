"use client";

import useViewContextStore from "@/app/store/viewContextStore";
import { findCuratedWidgetForDataset } from "../lib/widgets";
import { useDashboard } from "./dashboardQueries";

/**
 * The persisted insight id of the curated analysis of `datasetId` already on
 * the dashboard the viewer is on, or undefined when there is none (or off a
 * dashboard). Lets the Analyses pane show a curated card as "On dashboard",
 * and remove it, without first re-running the analysis. Best effort: see
 * `findCuratedWidgetForDataset`.
 */
export function useCuratedInsightOnDashboard(
  datasetId: number
): string | undefined {
  const viewContext = useViewContextStore((s) => s.viewContext);
  const dashboardId =
    viewContext?.page === "dashboard" ? viewContext.dashboard_id : "";
  const { data: dashboard } = useDashboard(dashboardId);
  return (
    findCuratedWidgetForDataset(dashboard?.widgets ?? [], datasetId)
      ?.insight_id ?? undefined
  );
}
