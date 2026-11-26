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
 * A user AOI goes on the map as the kind of area it is. A saved source
 * area behaves as a searched place: it replaces the reference area and
 * becomes the analysis selection. An owned custom area stacks beside the
 * others, keyed by its id. Geometry is fetched on demand for both.
 */

const isOwned = (userAoi: UserAoi) => userAoi.relationship === "owner";

/** Put a user AOI on the map and fly to it. */
export async function addUserAoiToMap(userAoi: UserAoi): Promise<void> {
  const aoi = userAoiToAoi(userAoi);
  if (!isOwned(userAoi)) {
    await addPlaceToMap(aoi);
    return;
  }
  const { addToRegistry, addLayer, flyToGeoJsonWithRetry } =
    useMapStore.getState();
  const geometry = await fetchAndRegisterAoi(aoi, addToRegistry);
  addLayer({
    id: userAoi.src_id,
    name: userAoi.name,
    type: "geojson",
    visible: true,
    featureRefs: [customAreaRef({ id: userAoi.src_id, name: userAoi.name })],
  });
  flyToGeoJsonWithRetry(geometry);
}

/** Find the map layer showing a user AOI, if it's on the map. */
export function findUserAoiLayer(
  layers: Layer[],
  userAoi: UserAoi
): Layer | undefined {
  if (isOwned(userAoi)) return layers.find((l) => l.id === userAoi.src_id);
  return findPlaceLayer(layers, userAoiToAoi(userAoi));
}

/**
 * Take a user AOI's layer off the map, and clear the analysis selection if
 * it's that area.
 */
export function removeUserAoiFromMap(layer: Layer, userAoi: UserAoi): void {
  removePlaceFromMap(layer, userAoiToAoi(userAoi));
}
