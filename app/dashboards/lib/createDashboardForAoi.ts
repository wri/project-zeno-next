import useDashboardStore from "@/app/store/dashboardStore";

/**
 * Create a dashboard seeded for an AOI and return its id (caller navigates).
 * Hydrates first so we load/seed existing dashboards rather than clobbering
 * localStorage when called from outside the dashboards layout (e.g. the map).
 */
export function createDashboardForAoi(name: string): string {
  const store = useDashboardStore.getState();
  store.hydrate();
  return store.createDashboard({ title: name, subtitle: name });
}
