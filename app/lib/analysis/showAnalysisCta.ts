import useChatStore from "@/app/store/chatStore";
import useMapStore from "@/app/store/mapStore";
import { DATASET_BY_ID, isViewOnlyDataset } from "@/app/constants/datasets";
import type { AnalysisSelection } from "@/app/store/selectAnalysisSlice";

/**
 * Surfaces the analyse CTA for an area selection. Analysis is intentional:
 * the CTA only appears when a dataset is active alongside the selected area.
 *
 * MVP surface is a nudge message in the chat stream; a future enhancement may
 * swap this for a map popup — that change should be contained to this module.
 *
 * Returns whether a CTA was surfaced.
 */
export function showAnalysisCta(selection: AnalysisSelection): boolean {
  if (!selection.name) return false;

  // A visible dataset layer IS the active dataset. Skip context sub-layers
  // (parentLayerId set) so we read the main dataset, not its sub-layer, and
  // skip view-only datasets — they have no analytics endpoint, so offering to
  // analyse one leads nowhere. Several datasets can be on the map at once, so
  // this picks the first analysable one rather than bailing outright.
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
  // Prefer the canonical catalogue name — it matches what sendMessage puts in
  // ui_context.dataset_selected — and fall back to the layer's display name.
  const datasetName =
    DATASET_BY_ID[datasetId]?.dataset_name ?? datasetLayer.name;
  if (!datasetName) return false;

  // Idempotent for the live pending nudge: the reactive trigger re-runs on
  // every context change, and an identical re-upsert would churn the card.
  const pending = useChatStore
    .getState()
    .messages.find(
      (m) => m.type === "analyse-nudge" && !m.analyseSuggestion?.accepted
    );
  if (
    pending?.analyseSuggestion?.areaName === selection.name &&
    pending.analyseSuggestion.datasetId === datasetId
  ) {
    return true;
  }

  useChatStore.getState().upsertAnalyseNudge({
    areaName: selection.name,
    datasetId,
    datasetName,
  });
  return true;
}
