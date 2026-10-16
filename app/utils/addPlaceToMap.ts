import { fetchAndRegisterAoi } from "@/app/store/chat-tools/pickAoi";
import useMapStore from "@/app/store/mapStore";
import type { AOI } from "@/app/types/chat";
import { aoiFlyBounds } from "@/app/utils/bboxUtils";
import {
  publishAnalysisSelection,
  removeOtherReferenceAreas,
} from "@/app/utils/referenceArea";

/**
 * Puts a place found by search on the map the way a boundary click does: it
 * becomes the one reference area (replacing the previous one), the analysis
 * selection, and the next chat message's selected area. The map flies to its
 * bbox. Geometry comes from `/api/geometry/:source/:srcId`.
 *
 * The layer is keyed by name, as assistant picks and boundary clicks are, so
 * picking the same place twice replaces it in place.
 */
export async function addPlaceToMap(aoi: AOI): Promise<void> {
  const { addToRegistry, addLayer, flyToBounds } = useMapStore.getState();

  await fetchAndRegisterAoi(aoi, addToRegistry);
  // The visible layer IS the scope: adding it also puts it in chat context.
  addLayer({
    id: aoi.name,
    name: aoi.name,
    type: "geojson",
    visible: true,
    featureRefs: [{ name: aoi.name, source: aoi.source }],
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
}

/** The area layer showing `aoi` (matched by source and id), if it's on the map. */
export function findPlaceLayer(
  layers: ReturnType<typeof useMapStore.getState>["layers"],
  aoi: Pick<AOI, "source" | "src_id">
) {
  return layers.find((l) =>
    (l.aoiSelection?.aois ?? []).some(
      (a) => a.source === aoi.source && a.src_id === aoi.src_id
    )
  );
}
