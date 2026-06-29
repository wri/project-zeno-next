"use client";

import { useEffect } from "react";
import useContextStore from "@/app/store/contextStore";
import useChatStore from "@/app/store/chatStore";

/**
 * Render-null watcher that surfaces a "create a dashboard for this area" nudge
 * in the chat whenever an AOI (area) context is selected. Mirrors
 * AnalysisCtaTrigger; upsertDashboardNudge is idempotent per area.
 */
export function DashboardCtaTrigger() {
  const context = useContextStore((s) => s.context);

  useEffect(() => {
    const area = context.find((c) => c.contextType === "area");
    if (!area) return;
    const name =
      area.aoiSelection?.name ??
      area.aoiData?.name ??
      (typeof area.content === "string" ? area.content : undefined);
    if (name) useChatStore.getState().upsertDashboardNudge(name);
  }, [context]);

  return null;
}
