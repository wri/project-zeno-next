"use client";
import { ZapDashboardPanel } from "./ZapDashboardPanel";
import { ZapMapPanel } from "./ZapMapPanel";
import { useZapMode } from "./use-zap-mode";

/** The zap popup: the dashboard panel on a dashboard, else the map panel. */
export function ZapPanel() {
  const { dashboardId } = useZapMode();
  return dashboardId ? (
    <ZapDashboardPanel dashboardId={dashboardId} />
  ) : (
    <ZapMapPanel />
  );
}
