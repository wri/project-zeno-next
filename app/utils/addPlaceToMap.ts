import { fetchAndRegisterAoi } from "@/app/store/chat-tools/pickAoi";
import { aoiFeatureRef, type Layer } from "@/app/store/layerManagerSlice";
import useMapStore from "@/app/store/mapStore";
import type { AOI } from "@/app/types/chat";
import { aoiFlyBounds } from "@/app/utils/bboxUtils";
import {
  publishAnalysisSelection,
  removeOtherReferenceAreas,
} from "@/app/utils/referenceArea";
import { useSelectionStore } from "@/src/features/analysis";

/**
 * Puts a place found by search on the map the way a boundary click does: it
 * becomes the one reference area (replacing the previous one), the analysis
 * selection, and the next chat message's selected area. The map flies to its
 * bbox, or to its geometry when the search result had none. Geometry comes
 * from `/api/geometry/:source/:srcId`.
 *
 * The layer is keyed by name, as assistant picks and boundary clicks are, so
 * picking the same place twice replaces it in place.
 */
export async function addPlaceToMap(aoi: AOI): Promise<void> {
  const { addToRegistry, addLayer, flyToBounds, flyToGeoJsonWithRetry } =
    useMapStore.getState();

  const geometry = await fetchAndRegisterAoi(aoi, addToRegistry);
  // The visible layer IS the scope: adding it also puts it in chat context.
  addLayer({
    id: aoi.name,
    name: aoi.name,
    type: "geojson",
    visible: true,
    featureRefs: [aoiFeatureRef(aoi)],
    aoiSelection: { name: aoi.name, aois: [aoi] },
  });
  removeOtherReferenceAreas(aoi.name);
  publishAnalysisSelection({
    name: aoi.name,
    source: aoi.source,
    srcId: aoi.src_id,
    subtype: aoi.subtype,
  });

  const bounds = aoiFlyBounds([aoi]);
  if (bounds) flyToBounds(bounds);
  else flyToGeoJsonWithRetry(geometry);
}

/**
 * Takes a place's layer off the map with its geometry, and retracts the
 * analysis selection when it is this place (so its nudges don't outlive it).
 */
export function removePlaceFromMap(
  layer: Layer,
  aoi: Pick<AOI, "source" | "src_id">
): void {
  const { removeLayer, removeFromRegistry, clearAnalysis, analysisSelection } =
    useMapStore.getState();
  // By the layer's own refs: a boundary click keys them by the map layer id
  // ("GADM"), which removeFromRegistry compares exactly.
  (layer.featureRefs ?? []).forEach(removeFromRegistry);
  removeLayer(layer.id);
  if (
    analysisSelection &&
    isSamePlace(analysisSelection.source, analysisSelection.srcId, aoi)
  ) {
    clearAnalysis();
    useSelectionStore.getState().clear();
  }
}

/**
 * The area layer showing `aoi`, if it's on the map: one added from search or
 * by the assistant (matched on its `aoiSelection`), or a boundary click
 * (matched on its feature refs, which carry no selection).
 */
export function findPlaceLayer(
  layers: Layer[],
  aoi: Pick<AOI, "source" | "src_id">
): Layer | undefined {
  return layers.find(
    (l) =>
      (l.aoiSelection?.aois ?? []).some((a) =>
        isSamePlace(a.source, a.src_id, aoi)
      ) ||
      (l.featureRefs ?? []).some((r) => isSamePlace(r.source, r.srcId, aoi))
  );
}

// Source casing differs by origin: "GADM" from a boundary click, "gadm" from
// search and the assistant.
function isSamePlace(
  source: string,
  srcId: string | undefined,
  aoi: Pick<AOI, "source" | "src_id">
): boolean {
  return (
    srcId !== undefined &&
    srcId === aoi.src_id &&
    source.toLowerCase() === aoi.source.toLowerCase()
  );
}
