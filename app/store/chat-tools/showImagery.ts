import { ChatMessage, InsightWidget, StreamMessage } from "@/app/types/chat";
import useMapStore from "../mapStore";
import { API_CONFIG } from "@/app/config/api";
import { getAuthHeaders } from "@/app/lib/api-client";
import { showApiError } from "@/app/hooks/useErrorHandler";
import {
  IMAGERY_ATTRIBUTION,
  IMAGERY_LAYER_NAME,
  imageryCardDescription,
  imageryLayerId,
  imageryLayerTitle,
  imageryThumbnailUrl,
  isImageryLayerId,
  type ImageryCardData,
} from "@/app/utils/imagery";

interface TileJson {
  bounds?: [number, number, number, number];
  minzoom?: number;
  maxzoom?: number;
}

/**
 * Fetches a tiler resource. The backend emits absolute URLs pointing at
 * whatever tiler it is configured to use — currently the public GFW tiles
 * service, which needs no auth. If the tiler is ever the Zeno API itself,
 * its routes require bearer auth, so attach it for API-origin URLs.
 */
function fetchTileJson(url: string): Promise<Response> {
  const headers = url.startsWith(API_CONFIG.API_HOST) ? getAuthHeaders() : {};
  return fetch(url, { headers });
}

/**
 * Handles the show_imagery tool: renders the Sentinel-2 mosaic from the
 * `imagery` agent-state entry as a raster layer.
 *
 * Each run adds a capture to the imagery legend group. The newest capture is
 * shown and earlier ones are hidden (not removed) — the legend's per-capture
 * toggles bring them back for comparison. Re-running an identical request
 * yields the same mosaic_id and simply upserts the existing layer, which
 * also makes thread replay idempotent.
 *
 * The TileJSON is fetched first for the mosaic's bounds and zoom range;
 * without the range MapLibre would request tiles outside it and get 404s
 * instead of overscaling. A failure to fetch it is a rare hard error
 * (expired mosaic, malformed URL) and the layer is simply not shown.
 *
 * A "Satellite Imagery" data card is added to the chat (dataset-card
 * pattern) once the layer is on the map — and not when the mosaic turned
 * out to be unavailable, so the card never advertises imagery the map
 * doesn't show.
 */
export async function showImageryTool(
  streamMessage: StreamMessage,
  addMessage: (message: Omit<ChatMessage, "id">) => void
) {
  const imagery = streamMessage.imagery;
  if (!imagery) return;

  const { addLayer, setLayerVisibility, reorderLayers } =
    useMapStore.getState();

  let tileJson: TileJson;
  try {
    const res = await fetchTileJson(imagery.tilejson_url);
    if (res.status === 401 || res.status === 403) {
      showApiError(
        "Your session has expired. Please sign in again to view satellite imagery.",
        { title: "Session Expired" }
      );
      return;
    }
    if (!res.ok) {
      console.warn(
        `Imagery mosaic unavailable (HTTP ${res.status}); not showing layer`
      );
      return;
    }
    tileJson = (await res.json()) as TileJson;
  } catch (error) {
    console.error("Failed to load imagery TileJSON:", error);
    return;
  }

  const id = imageryLayerId(imagery.mosaic_id);

  // Newest capture wins: hide earlier captures so the map shows the mosaic
  // the agent just produced. They stay in the legend for toggling back.
  useMapStore
    .getState()
    .layers.filter((l) => isImageryLayerId(l.id) && l.id !== id && l.visible)
    .forEach((l) => setLayerVisibility(l.id, false));

  addLayer({
    id,
    name: imageryLayerTitle(imagery.target_date),
    type: "raster",
    visible: true,
    tileUrl: imagery.tile_url,
    minzoom: tileJson.minzoom,
    maxzoom: tileJson.maxzoom,
    bounds: tileJson.bounds,
    attribution: IMAGERY_ATTRIBUTION,
    startDate: imagery.date_start,
    endDate: imagery.date_end,
    imagery,
  });

  // addLayer appends, which would leave the new mosaic underneath any
  // earlier ones it overlaps. Reorder so the newest imagery layer sits at
  // the top of the imagery group (which itself stays below dataset rasters —
  // see DynamicTileLayers).
  const layers = useMapStore.getState().layers;
  const nonImageryIds = layers
    .filter((l) => !isImageryLayerId(l.id))
    .map((l) => l.id);
  const olderImageryIds = layers
    .filter((l) => isImageryLayerId(l.id) && l.id !== id)
    .map((l) => l.id);
  reorderLayers([...nonImageryIds, id, ...olderImageryIds]);

  // No camera movement here: the viewport was already positioned by
  // pick_aoi, and re-fitting to the mosaic bounds would yank the map
  // away from wherever the user is looking.

  const cardData: ImageryCardData = {
    ...imagery,
    thumbnail_url: imageryThumbnailUrl(
      imagery.tile_url,
      tileJson.bounds,
      tileJson.minzoom,
      tileJson.maxzoom
    ),
  };
  const imageryWidget: InsightWidget = {
    type: "imagery-card",
    title: IMAGERY_LAYER_NAME,
    description: imageryCardDescription(imagery),
    data: cardData,
    xAxis: "",
    yAxis: "",
  };
  addMessage({
    type: "widget",
    message: "",
    widgets: [imageryWidget],
    timestamp: streamMessage.timestamp,
  });
}
