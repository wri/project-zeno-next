"use client";
import { useEffect } from "react";
import useMapStore from "@/app/store/mapStore";
import { useFeatureFlag } from "@/src/shared/lib/feature-flags";
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
  // Re-run when the visible layers change so the CTA surfaces as soon as a
  // dataset layer is added alongside an analysis selection (and clears when it
  // is removed). The visible dataset layer is the source of truth for "is a
  // dataset active?".
  const layers = useMapStore((state) => state.layers);

  useEffect(() => {
    if (!enabled || !analysisSelection) return;
    showAnalysisCta(analysisSelection);
  }, [enabled, analysisSelection, layers]);

  return null;
}
