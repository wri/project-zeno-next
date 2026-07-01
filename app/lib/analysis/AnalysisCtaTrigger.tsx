"use client";
import { useEffect } from "react";
import useMapStore from "@/app/store/mapStore";
import useContextStore from "@/app/store/contextStore";
import { showAnalysisCta } from "./showAnalysisCta";

/**
 * Render-null watcher implementing the CTA gate reactively: the analyse nudge
 * surfaces whenever an analysis selection and an active dataset coexist,
 * regardless of which was set first. Mounted once in the (chat) layout;
 * showAnalysisCta is idempotent, so re-runs on unrelated context changes are
 * harmless.
 */
export function AnalysisCtaTrigger() {
  const analysisSelection = useMapStore((state) => state.analysisSelection);
  const context = useContextStore((state) => state.context);

  useEffect(() => {
    if (!analysisSelection) return;
    showAnalysisCta(analysisSelection);
  }, [analysisSelection, context]);

  return null;
}
