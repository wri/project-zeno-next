import useMapStore from "../mapStore";
import { isImageryLayerId } from "@/app/utils/imagery";

/**
 * Make an imagery capture the one on show: hide the other captures (they stay
 * in the legend's captures list for toggling back) and move it to the top of
 * the imagery group. Shared by every way a capture is added: the agent's
 * show_imagery / show_planet_imagery, and the imagery focus editor.
 *
 * addLayer appends, which would leave the new capture under earlier ones it
 * overlaps. The imagery group itself stays below dataset rasters (see
 * DynamicTileLayers and Map.tsx).
 */
export function promoteImageryLayer(id: string): void {
  const { setLayerVisibility, reorderLayers } = useMapStore.getState();
  useMapStore
    .getState()
    .layers.filter((l) => isImageryLayerId(l.id) && l.id !== id && l.visible)
    .forEach((l) => setLayerVisibility(l.id, false));

  const layers = useMapStore.getState().layers;
  const nonImageryIds = layers
    .filter((l) => !isImageryLayerId(l.id))
    .map((l) => l.id);
  const olderImageryIds = layers
    .filter((l) => isImageryLayerId(l.id) && l.id !== id)
    .map((l) => l.id);
  reorderLayers([...nonImageryIds, id, ...olderImageryIds]);
}
