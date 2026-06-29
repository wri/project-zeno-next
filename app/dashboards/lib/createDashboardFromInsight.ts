import useDashboardStore from "@/app/store/dashboardStore";
import type { InsightWidget } from "@/app/types/chat";

/**
 * Create a dashboard seeded with a single analysis and return its id (the
 * caller navigates). Titles the dashboard after the analysis' area when known,
 * falling back to the analysis title. Hydrates first so we load/seed existing
 * dashboards rather than clobbering localStorage when called from the map.
 */
export function createDashboardFromInsight(
  insight: InsightWidget,
  verified: boolean
): string {
  const store = useDashboardStore.getState();
  store.hydrate();
  const area = insight.analysisParams?.areas?.[0];
  const id = store.createDashboard({
    title: area ?? insight.title,
    subtitle: area,
  });
  store.addWidget(id, { kind: "insight", span: 1, verified, insight });
  return id;
}
