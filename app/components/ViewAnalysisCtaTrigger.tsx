"use client";

import { useEffect } from "react";
import useContextStore from "@/app/store/contextStore";
import useChatStore from "@/app/store/chatStore";

/**
 * Render-null watcher that surfaces a "View analysis" nudge in the chat whenever
 * an AOI (area) context is selected. Mirrors DashboardCtaTrigger; the nudge is
 * idempotent per area and positioned right before the dashboard nudge (so the
 * dashboard "Monitor" CTA reads last). Mounted after DashboardCtaTrigger so the
 * dashboard nudge exists to anchor against.
 */
export function ViewAnalysisCtaTrigger() {
  const context = useContextStore((s) => s.context);

  useEffect(() => {
    const area = context.find((c) => c.contextType === "area");
    if (!area) return;
    const aoi = area.aoiSelection?.aois?.[0];
    const name =
      area.aoiSelection?.name ??
      area.aoiData?.name ??
      (typeof area.content === "string" ? area.content : undefined);
    const source = aoi?.source ?? area.aoiData?.source;
    // Analysis needs a backend-known source (gadm/kba/…); skip custom areas.
    if (!name || !source) return;
    useChatStore.getState().upsertViewAnalysisNudge({
      name,
      source,
      srcId: aoi?.src_id ?? area.aoiData?.src_id,
      subtype: aoi?.subtype ?? area.aoiData?.subtype,
    });
  }, [context]);

  return null;
}
