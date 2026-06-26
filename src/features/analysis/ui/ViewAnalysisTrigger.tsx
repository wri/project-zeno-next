"use client";
import { useEffect } from "react";

import useContextStore from "@/app/store/contextStore";
import { useFeatureFlag } from "@/app/hooks/useFeatureFlag";

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
  const context = useContextStore((state) => state.context);

  useEffect(() => {
    if (!enabled || !selection) return;
    showViewAnalysisNudge(selection);
  }, [enabled, selection, context]);

  return null;
}
