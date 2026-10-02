import useChatStore from "@/app/store/chatStore";
import useMapStore from "@/app/store/mapStore";
import { DATASET_BY_ID, isViewOnlyDataset } from "@/app/constants/datasets";

import type { AreaSelection } from "../model/area-selection";

import { isAnalysableForSource } from "../lib/curated-catalogue";
import { resolveAnalysisWindow } from "../lib/default-analysis-window";

/**
 * Surfaces the "View Analysis" nudge for an area selection. Like the analyse
 * CTA, this is intentional: the nudge only appears when a dataset is active
 * alongside the selected area. Unlike the analyse nudge (which sends a
 * generative prompt to the agent), accepting this nudge runs the analysis
 * directly via the analytics API (useAnalysis) and renders the result in the
 * insight workspace.
 *
 * Mirrors app/lib/analysis/showAnalysisCta but lives inside the analysis slice
 * so the direct-analysis feature stays isolated. Returns whether a nudge was
 * surfaced.
 */
export function showViewAnalysisNudge(selection: AreaSelection): boolean {
  if (!selection.name) return false;

  // Mirrors showAnalysisCta's gate: skip context sub-layers (parentLayerId
  // set) so the sub-layer's own `name` can never stand in for the dataset
  // name, and skip view-only datasets — they have no analytics endpoint, so
  // nudging towards an analysis that can never run leads nowhere.
  const datasetLayer = useMapStore
    .getState()
    .layers.find(
      (l) =>
        typeof l.datasetId === "number" &&
        !l.parentLayerId &&
        !isViewOnlyDataset(l.datasetId)
    );
  if (!datasetLayer) return false;

  const datasetId = datasetLayer.datasetId!;
  // Don't offer an analysis the backend can't compute for this kind of area
  // (e.g. tree cover gain for a protected area); the catalogue owns the rule.
  if (!isAnalysableForSource(datasetId, selection.source)) return false;
  // Prefer the canonical catalogue name — it matches what sendMessage puts in
  // ui_context.dataset_selected — and fall back to the layer's display name.
  const datasetName =
    DATASET_BY_ID[datasetId]?.dataset_name ?? datasetLayer.name;
  if (!datasetName) return false;

  const { startDate, endDate } = resolveAnalysisWindow(
    datasetId,
    useChatStore.getState().dateRange
  );

  // Idempotent for the live pending nudge: the reactive trigger re-runs on
  // every context change, and an identical re-upsert would churn the card.
  //
  // The key is every input accepting would act on, not just the AOI: the card
  // runs its own stored window, so leaving the dates out would let a re-run
  // short-circuit on a stale payload and analyse the previous period after the
  // user changed the pinned range.
  const pending = useChatStore
    .getState()
    .messages.find(
      (m) =>
        m.type === "view-analysis-nudge" && !m.viewAnalysisSuggestion?.accepted
    );
  if (
    pending?.viewAnalysisSuggestion?.area.name === selection.name &&
    pending.viewAnalysisSuggestion.datasetId === datasetId &&
    pending.viewAnalysisSuggestion.startDate === startDate &&
    pending.viewAnalysisSuggestion.endDate === endDate
  ) {
    return true;
  }

  useChatStore.getState().upsertViewAnalysisNudge({
    area: selection,
    datasetId,
    datasetName,
    startDate,
    endDate,
  });
  return true;
}
