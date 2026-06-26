import { format } from "date-fns";

import useChatStore from "@/app/store/chatStore";
import useContextStore from "@/app/store/contextStore";
import { DATASET_BY_ID } from "@/app/constants/datasets";

import type { AreaSelection } from "../model/area-selection";

// Default analysis window used when the user has not pinned a date range in
// context — wide enough to cover the catalogue's annual datasets.
const DEFAULT_START_DATE = "2001-01-01";
const DEFAULT_END_DATE = "2025-12-31";

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

  const context = useContextStore.getState().context;

  const datasetContext = context.find(
    (ctx) => ctx.contextType === "layer" && typeof ctx.datasetId === "number"
  );
  if (!datasetContext) return false;

  const datasetId = datasetContext.datasetId!;
  // Prefer the canonical catalogue name — it matches what sendMessage puts in
  // ui_context.dataset_selected — and fall back to the layer's display name.
  const datasetName =
    DATASET_BY_ID[datasetId]?.dataset_name ?? datasetContext.layerName;
  if (!datasetName) return false;

  const dateContext = context.find((ctx) => ctx.contextType === "date");
  const startDate = dateContext?.dateRange
    ? format(dateContext.dateRange.start, "yyyy-MM-dd")
    : DEFAULT_START_DATE;
  const endDate = dateContext?.dateRange
    ? format(dateContext.dateRange.end, "yyyy-MM-dd")
    : DEFAULT_END_DATE;

  // Idempotent for the live pending nudge: the reactive trigger re-runs on
  // every context change, and an identical re-upsert would churn the card.
  const pending = useChatStore
    .getState()
    .messages.find(
      (m) =>
        m.type === "view-analysis-nudge" && !m.viewAnalysisSuggestion?.accepted
    );
  if (
    pending?.viewAnalysisSuggestion?.area.name === selection.name &&
    pending.viewAnalysisSuggestion.datasetId === datasetId
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
