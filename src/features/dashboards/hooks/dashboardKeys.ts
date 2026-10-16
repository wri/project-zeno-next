import type { DateRange } from "@/src/shared/lib/iso-date";
import type { AlertsAoi, AlertsLandFilter } from "../lib/alertsWidgets";

export const dashboardKeys = {
  all: ["dashboards"] as const,
  detail: (id: string) => ["dashboards", id] as const,
  aois: (query: string, source: string | null) =>
    ["dashboard-aois", query, source] as const,
  analysisTemplates: ["analysis-templates"] as const,
  // One live alerts list per area, fetched window and land filter (the alerts widget).
  alerts: (aoi: AlertsAoi, range: DateRange, landFilter: AlertsLandFilter) =>
    [
      "dashboard-alerts",
      aoi.source,
      aoi.srcId,
      aoi.subtype,
      range.start,
      range.end,
      landFilter,
    ] as const,
  // A mutation key, not a query key: lets any mounted card see a template
  // request that is still in flight for this dashboard.
  applyTemplate: (dashboardId: string) =>
    ["apply-analysis-template", dashboardId] as const,
};
