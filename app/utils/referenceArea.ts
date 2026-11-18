import useMapStore from "@/app/store/mapStore";
import { isAreaLayer } from "@/app/store/layerManagerSlice";
import type { AnalysisSelection } from "@/app/store/selectAnalysisSlice";
import { useSelectionStore } from "@/src/features/analysis";

/**
 * Leaves `keepId` as the only reference area on the map. A reference area is
 * one picked from a boundary set (a click on a boundary layer, a place from
 * search, an assistant pick); there is one at a time, so picking a new one
 * replaces the rest. Custom (drawn/uploaded) areas — whose feature refs use
 * source "custom" — stay.
 */
export function removeOtherReferenceAreas(keepId: string): void {
  const { layers, removeLayer } = useMapStore.getState();
  layers
    .filter(
      (l) =>
        l.id !== keepId &&
        isAreaLayer(l) &&
        !(l.featureRefs ?? []).some((r) => r.source === "custom")
    )
    .forEach((l) => removeLayer(l.id));
}

/**
 * Publishes a reference area as the analysis selection both nudges consume:
 * `AnalysisCtaTrigger` via `mapStore.analysisSelection`, and the direct
 * "View Analysis" nudge via the selection store. An area without a backend id
 * can't be analysed, so it (or null) clears the selection instead.
 */
export function publishAnalysisSelection(
  selection: AnalysisSelection | null
): void {
  if (!selection?.srcId) {
    useMapStore.getState().clearAnalysis();
    useSelectionStore.getState().clear();
    return;
  }
  useMapStore.getState().setAnalysis(selection);
  useSelectionStore.getState().select(selection);
}
