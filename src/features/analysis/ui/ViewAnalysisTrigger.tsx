"use client";
import { useEffect } from "react";

import useChatStore from "@/app/store/chatStore";
import useMapStore from "@/app/store/mapStore";

import useSelectionStore from "../model/selection-store";
import { showViewAnalysisNudge } from "./show-view-analysis-nudge";

/**
 * Render-null watcher that surfaces the direct-analysis "View Analysis" nudge
 * whenever an area selection and an active dataset coexist — the in-chat
 * replacement for the AnalysisCTA popup mount.
 *
 * Mounted once in the (chat) layout; showViewAnalysisNudge is idempotent, so
 * re-runs on unrelated context changes are harmless.
 */
export function ViewAnalysisTrigger() {
  const selection = useSelectionStore((state) => state.selection);
  const datasetLayer = useMapStore((state) =>
    state.layers.find((l) => typeof l.datasetId === "number")
  );
  const dateRange = useChatStore((state) => state.dateRange);

  useEffect(() => {
    if (!selection) return;
    showViewAnalysisNudge(selection);
  }, [selection, datasetLayer, dateRange]);

  return null;
}
