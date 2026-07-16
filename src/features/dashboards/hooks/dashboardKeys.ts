export const dashboardKeys = {
  all: ["dashboards"] as const,
  detail: (id: string) => ["dashboards", id] as const,
  aois: (query: string, source: string | null) =>
    ["dashboard-aois", query, source] as const,
};
