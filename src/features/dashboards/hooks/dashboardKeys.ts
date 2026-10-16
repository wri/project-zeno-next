export const dashboardKeys = {
  all: ["dashboards"] as const,
  detail: (id: string) => ["dashboards", id] as const,
  aois: (query: string, source: string | null) =>
    ["dashboard-aois", query, source] as const,
  analysisTemplates: ["analysis-templates"] as const,
  // One live alerts list per area and fetched window (the alerts widget).
  alerts: (
    source: string,
    srcId: string,
    subtype: string,
    start: string,
    end: string
  ) => ["dashboard-alerts", source, srcId, subtype, start, end] as const,
  // A mutation key, not a query key: lets any mounted card see a template
  // request that is still in flight for this dashboard.
  applyTemplate: (dashboardId: string) =>
    ["apply-analysis-template", dashboardId] as const,
};
