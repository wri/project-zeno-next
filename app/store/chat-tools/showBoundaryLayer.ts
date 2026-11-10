import { StreamMessage } from "@/app/types/chat";
import { LayerId, selectLayerOptions } from "@/app/types/map";
import useMapStore from "../mapStore";

/**
 * The boundary layer id for a backend source key (`oil_palm` -> `OIL_PALM`),
 * or `undefined` when the map has no such layer.
 */
export function boundaryLayerId(source: string): LayerId | undefined {
  const key = source.toUpperCase();
  return selectLayerOptions.find((o) => o.id.toUpperCase() === key)?.id;
}

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
