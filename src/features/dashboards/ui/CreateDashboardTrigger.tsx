"use client";
import { useEffect } from "react";

import useMapStore from "@/app/store/mapStore";
import useChatStore from "@/app/store/chatStore";

import { showCreateDashboardNudge } from "./show-create-dashboard-nudge";

/**
 * Render-null watcher that surfaces the "Create Dashboard" nudge whenever an
 * analysis selection and an active dataset coexist — same gate as
 * AnalysisCtaTrigger. Mounted once in the (chat) layout.
 *
 * showCreateDashboardNudge is idempotent per area+dataset, so re-runs on
 * unrelated context changes are harmless.
 */
export function CreateDashboardTrigger() {
  const analysisSelection = useMapStore((state) => state.analysisSelection);
  const layers = useMapStore((state) => state.layers);
  // The seeded insight uses the pinned window, so a date change makes the
  // standing offer stale — re-run to re-key it.
  const dateRange = useChatStore((state) => state.dateRange);

  useEffect(() => {
    if (!analysisSelection) return;
    showCreateDashboardNudge(analysisSelection);
  }, [analysisSelection, layers, dateRange]);

  return null;
}
