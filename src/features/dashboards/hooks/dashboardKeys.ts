import type { AlertsAoi, DateRange } from "../lib/alertsWidgets";

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
  // One live alerts list per area and fetched window (the alerts widget).
  alerts: (aoi: AlertsAoi, range: DateRange) =>
    [
      "dashboard-alerts",
      aoi.source,
      aoi.srcId,
      aoi.subtype,
      range.start,
      range.end,
    ] as const,
  // A mutation key, not a query key: lets any mounted card see a template
  // request that is still in flight for this dashboard.
  applyTemplate: (dashboardId: string) =>
    ["apply-analysis-template", dashboardId] as const,
};
