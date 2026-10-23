import type { DateRange } from "@/src/shared/lib/iso-date";
import type { AlertsAoi, AlertsLandFilter } from "../lib/alertsWidgets";

export const dashboardKeys = {
  all: ["dashboards"] as const,
  detail: (id: string) => ["dashboards", id] as const,
  analysisTemplates: ["analysis-templates"] as const,
  // Prefix of every alerts summary below. Not under `all`: renames and moves
  // would otherwise re-run an analytics-backed request that they cannot
  // change. Writes that can add or remove a chart invalidate it instead
  // (`invalidateAlertsSummaries`).
  alertsSummaries: ["dashboard-alerts-summary"] as const,
  // `ids` sorted by the caller, so one set of dashboards shares one entry.
  alertsSummary: (ids: readonly string[]) =>
    ["dashboard-alerts-summary", ids] as const,
  // One live alerts list per area, fetched window and land filter (the
  // alerts widget); no window is the backend's default.
  alerts: (
    aoi: AlertsAoi,
    range: DateRange | undefined,
    landFilter: AlertsLandFilter
  ) =>
    [
      "dashboard-alerts",
      aoi.source,
      aoi.srcId,
      aoi.subtype,
      range?.start ?? null,
      range?.end ?? null,
      landFilter,
    ] as const,
  // The dataset's own dates, the same for every user and dashboard, so no
  // dashboard write invalidates them.
  alertsFreshness: ["integrated-alerts-freshness"] as const,
  // A mutation key, not a query key: lets any mounted card see a template
  // request that is still in flight for this dashboard.
  applyTemplate: (dashboardId: string) =>
    ["apply-analysis-template", dashboardId] as const,
};
