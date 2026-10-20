export const dashboardKeys = {
  all: ["dashboards"] as const,
  detail: (id: string) => ["dashboards", id] as const,
  aois: (query: string, source: string | null) =>
    ["dashboard-aois", query, source] as const,
  analysisTemplates: ["analysis-templates"] as const,
  // `ids` sorted by the caller, so one set of dashboards shares one entry.
  alertsSummary: (ids: readonly string[]) =>
    ["dashboard-alerts-summary", ids] as const,
  // A mutation key, not a query key: lets any mounted card see a template
  // request that is still in flight for this dashboard.
  applyTemplate: (dashboardId: string) =>
    ["apply-analysis-template", dashboardId] as const,
};
