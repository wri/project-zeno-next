import { fetchAndRegisterAoi } from "@/app/store/chat-tools/pickAoi";
import { customAreaRef, type Layer } from "@/app/store/layerManagerSlice";
import useMapStore from "@/app/store/mapStore";
import {
  addPlaceToMap,
  findPlaceLayer,
  removePlaceFromMap,
} from "@/app/utils/addPlaceToMap";
import { userAoiToAoi, type UserAoi } from "@/src/entities/user-aoi";

/*
 * A library entry goes on the map as the kind of area it is. A saved source
 * area behaves as a searched place: it replaces the reference area and
 * becomes the analysis selection. An owned custom area stacks beside the
 * others, keyed by its id. Geometry is fetched on demand for both.
 */

const isOwned = (entry: UserAoi) => entry.relationship === "owner";

/** Put a library entry on the map and fly to it. */
export async function addLibraryAreaToMap(entry: UserAoi): Promise<void> {
  const aoi = userAoiToAoi(entry);
  if (!isOwned(entry)) {
    await addPlaceToMap(aoi);
    return;
  }
  const { addToRegistry, addLayer, flyToGeoJsonWithRetry } =
    useMapStore.getState();
  const geometry = await fetchAndRegisterAoi(aoi, addToRegistry);
  addLayer({
    id: entry.src_id,
    name: entry.name,
    type: "geojson",
    visible: true,
    featureRefs: [customAreaRef({ id: entry.src_id, name: entry.name })],
  });
  flyToGeoJsonWithRetry(geometry);
}

/** Find the map layer showing a library entry, if it's on the map. */
export function findLibraryAreaLayer(
  layers: Layer[],
  entry: UserAoi
): Layer | undefined {
  if (isOwned(entry)) return layers.find((l) => l.id === entry.src_id);
  return findPlaceLayer(layers, userAoiToAoi(entry));
}

/** Take a library entry's layer off the map. */
export function removeLibraryAreaFromMap(layer: Layer, entry: UserAoi): void {
  if (isOwned(entry)) {
    useMapStore.getState().removeLayer(layer.id);
    return;
  }
  removePlaceFromMap(layer, userAoiToAoi(entry));
}
