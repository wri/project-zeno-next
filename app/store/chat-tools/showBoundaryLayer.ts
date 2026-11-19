import { StreamMessage } from "@/app/types/chat";
import { boundaryLayerId } from "@/app/utils/areaHelpers";
import useMapStore from "../mapStore";

/**
 * Handles the show_boundary_layer tool: shows the boundary layer from the
 * `boundary_layer` agent-state entry, so the user can click a feature on it
 * to pick that area.
 *
 * Showing a boundary layer is not an area selection, so this neither adds an
 * area layer nor moves the map: a place the agent selected with pick_aoi has
 * already positioned the viewport. Replaying a thread sets the same layer
 * again, which is harmless.
 */
export function showBoundaryLayerTool(streamMessage: StreamMessage) {
  const source = streamMessage.boundary_layer?.source;
  if (!source) return;

  const id = boundaryLayerId(source);
  if (!id) {
    console.warn(`Unknown boundary layer "${source}"; not showing it`);
    return;
  }
  useMapStore.getState().setSelectAreaLayer(id);
}
