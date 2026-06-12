import useChatStore from "@/app/store/chatStore";
import useContextStore from "@/app/store/contextStore";
import { DATASET_BY_ID } from "@/app/constants/datasets";
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

  const datasetContext = useContextStore
    .getState()
    .context.find(
      (ctx) => ctx.contextType === "layer" && typeof ctx.datasetId === "number"
    );
  if (!datasetContext) return false;

  const datasetId = datasetContext.datasetId!;
  // Prefer the canonical catalogue name — it matches what sendMessage puts in
  // ui_context.dataset_selected — and fall back to the layer's display name.
  const datasetName =
    DATASET_BY_ID[datasetId]?.dataset_name ?? datasetContext.layerName;
  if (!datasetName) return false;

  useChatStore.getState().upsertAnalyseNudge({
    areaName: selection.name,
    datasetId,
    datasetName,
  });
  return true;
}
