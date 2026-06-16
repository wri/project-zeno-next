"use client";
import { useEffect } from "react";
import useMapStore from "@/app/store/mapStore";
import useContextStore from "@/app/store/contextStore";
import { useFeatureFlag } from "@/app/hooks/useFeatureFlag";
import { showAnalysisCta } from "./showAnalysisCta";

/**
 * Render-null watcher implementing the CTA gate reactively: the analyse nudge
 * surfaces whenever an analysis selection and an active dataset coexist,
 * regardless of which was set first. Mounted once in the (chat) layout;
 * showAnalysisCta is idempotent, so re-runs on unrelated context changes are
 * harmless.
 */
export function AnalysisCtaTrigger() {
  const enabled = useFeatureFlag("analysis");
  const analysisSelection = useMapStore((state) => state.analysisSelection);
  const context = useContextStore((state) => state.context);

  useEffect(() => {
    if (!enabled || !analysisSelection) return;
    showAnalysisCta(analysisSelection);
  }, [enabled, analysisSelection, context]);

  return null;
}
