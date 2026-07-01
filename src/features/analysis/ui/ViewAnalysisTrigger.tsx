"use client";
import { useEffect } from "react";

import useChatStore from "@/app/store/chatStore";
import useMapStore from "@/app/store/mapStore";
import { useFeatureFlag } from "@/src/shared/lib/feature-flags";

import useSelectionStore from "../model/selection-store";
import { showViewAnalysisNudge } from "./show-view-analysis-nudge";

/**
 * Render-null watcher that surfaces the direct-analysis "View Analysis" nudge
 * whenever an area selection and an active dataset coexist — the in-chat
 * replacement for the AnalysisCTA popup mount.
 *
 * Gated behind ?ff=analysis (the same flag the popup lived behind), so it stays
 * additive. Mounted once in the (chat) layout; showViewAnalysisNudge is
 * idempotent, so re-runs on unrelated context changes are harmless.
 */
export function ViewAnalysisTrigger() {
  const enabled = useFeatureFlag("analysis");
  const selection = useSelectionStore((state) => state.selection);
  const datasetLayer = useMapStore((state) =>
    state.layers.find((l) => typeof l.datasetId === "number")
  );
  const dateRange = useChatStore((state) => state.dateRange);

  useEffect(() => {
    if (!enabled || !selection) return;
    showViewAnalysisNudge(selection);
  }, [enabled, selection, datasetLayer, dateRange]);

  return null;
}
