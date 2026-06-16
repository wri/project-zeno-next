import { format, parseISO } from "date-fns";
import { StreamMessage } from "@/app/types/chat";
import useMapStore from "../mapStore";
import { API_CONFIG } from "@/app/config/api";
import { getAuthHeaders } from "@/app/lib/api-client";
import { showApiError } from "@/app/hooks/useErrorHandler";

export const IMAGERY_LAYER_ID_PREFIX = "imagery-";
export const IMAGERY_LAYER_NAME = "Satellite imagery";
export const IMAGERY_ATTRIBUTION = "Contains modified Copernicus Sentinel data";

interface TileJson {
  bounds?: [number, number, number, number];
  minzoom?: number;
  maxzoom?: number;
}

function layerName(targetDate: string): string {
  try {
    return `${IMAGERY_LAYER_NAME} (${format(parseISO(targetDate), "MMM d, yyyy")})`;
  } catch {
    return IMAGERY_LAYER_NAME;
  }
}

/**
 * Fetches a titiler resource. The backend emits absolute titiler URLs whose
 * host it controls via its own MOSAIC_TILER_URL setting (the Zeno API itself,
 * or a standalone titiler) — so we consume them as-is rather than rewriting
 * the origin on the frontend. When the titiler is the Zeno API, its /mosaic
 * routes require bearer auth, so attach it for requests to the API origin,
 * mirroring the map's transformRequest. Other titiler hosts are unauthenticated.
 */
function fetchTitiler(url: string): Promise<Response> {
  const headers = url.startsWith(API_CONFIG.API_HOST) ? getAuthHeaders() : {};
  return fetch(url, { headers });
}

/**
 * Handles the show_imagery tool: renders the Sentinel-2 mosaic from the
 * `imagery` agent-state entry as a raster layer.
 *
 * Each run adds its own legend entry — earlier mosaics are kept (the user
 * removes them via the legend), with the newest one rendered on top of the
 * imagery stack. Re-running an identical request yields the same mosaic_id
 * and simply upserts the existing layer.
 *
 * The backend emits absolute titiler URLs (tile_url / tilejson_url) pointing
 * at whatever titiler it is configured to use; the frontend consumes them
 * directly (see fetchTitiler). The TileJSON is fetched first to get the
 * mosaic's bounds and zoom range. The mosaic_id is an opaque recipe token, so
 * payloads stay valid indefinitely (the server rebuilds cold mosaics on demand
 * — budget ~1–2s for this fetch when replaying an old thread). A 401 means the
 * session expired and is surfaced like any other API auth error; any other
 * non-ok response is a rare hard error (deleted custom area, malformed URL, or
 * a mosaic the titiler cannot read) and the layer is simply not shown.
 */
export async function showImageryTool(streamMessage: StreamMessage) {
  const imagery = streamMessage.imagery;
  if (!imagery) return;

  const { addLayer, reorderLayers } = useMapStore.getState();

  let tileJson: TileJson;
  try {
    const res = await fetchTitiler(imagery.tilejson_url);
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

  const id = `${IMAGERY_LAYER_ID_PREFIX}${imagery.mosaic_id}`;

  addLayer({
    id,
    name: layerName(imagery.target_date),
    type: "raster",
    visible: true,
    tileUrl: imagery.tile_url,
    minzoom: tileJson.minzoom ?? 8,
    maxzoom: tileJson.maxzoom ?? 14,
    bounds: tileJson.bounds,
    attribution: IMAGERY_ATTRIBUTION,
    startDate: imagery.date_start,
    endDate: imagery.date_end,
    imagery,
  });

  // addLayer appends, which would leave the new mosaic underneath any
  // earlier ones it overlaps. Reorder so the newest imagery layer sits at
  // the top of the imagery group (which itself stays below dataset rasters).
  const layers = useMapStore.getState().layers;
  const nonImageryIds = layers
    .filter((l) => !l.id.startsWith(IMAGERY_LAYER_ID_PREFIX))
    .map((l) => l.id);
  const olderImageryIds = layers
    .filter((l) => l.id.startsWith(IMAGERY_LAYER_ID_PREFIX) && l.id !== id)
    .map((l) => l.id);
  reorderLayers([...nonImageryIds, id, ...olderImageryIds]);

  // No camera movement here: the viewport was already positioned by
  // pick_aoi, and re-fitting to the mosaic bounds would yank the map
  // away from wherever the user is looking.
}
