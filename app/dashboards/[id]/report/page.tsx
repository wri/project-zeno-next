"use client";

import { useAuthGuard } from "@/app/hooks/useAuthGuard";
import { DashboardReportPage } from "@/src/features/dashboards";

/**
 * Print/export surface for a dashboard — the report rendering on its own
 * route, without the app shell (no PageHeader, no chat, no analyses pane).
 * Opened by the dashboard header's Export action; "Save as PDF" is the
 * browser's print dialog.
 */
export default function DashboardReportRoute() {
  const isReady = useAuthGuard();
  if (!isReady) return null;

  return <DashboardReportPage />;
}
