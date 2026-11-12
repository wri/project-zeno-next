import useZapDashboardStore from "../model/zap-dashboard-store";
import useZapStore from "../model/zap-store";
import { runDashboardZap } from "./run-dashboard-zap";
import { isZapBusy, runZap } from "./run-zap";

/** Sends a zap prompt: to the dashboard planner on a dashboard, else the map. */
export const submitZap = (prompt: string, dashboardId: string | null) =>
  dashboardId ? runDashboardZap(prompt, dashboardId) : runZap(prompt);

/** Whether zap plans or runs now, on the dashboard or else on the map. */
export function useZapBusy(dashboardId: string | null): boolean {
  const map = useZapStore((s) => isZapBusy(s.status));
  const dashboard = useZapDashboardStore((s) => isZapBusy(s.status));
  return dashboardId ? dashboard : map;
}
