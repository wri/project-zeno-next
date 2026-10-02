"use client";

import { useAuthGuard } from "@/app/hooks/useAuthGuard";
import { DashboardReportPage } from "@/src/features/dashboards";

/**
 * Print/export surface for a dashboard: the widgets as a read-only document on
 * their own route, without the app shell (no PageHeader, chat or analyses
 * pane). Opened by the dashboard header's Export action; "Save as PDF" is the
 * browser's print dialog.
 */
export default function DashboardReportRoute() {
  const isReady = useAuthGuard();
  if (!isReady) return null;

  return <DashboardReportPage />;
}
