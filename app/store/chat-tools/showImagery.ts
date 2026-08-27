import { StreamMessage } from "@/app/types/chat";
import useMapStore from "../mapStore";
import { API_CONFIG } from "@/app/config/api";
import { getAuthHeaders } from "@/app/lib/api-client";
import { showApiError } from "@/app/hooks/useErrorHandler";
import {
  IMAGERY_ATTRIBUTION,
  imageryLayerId,
  imageryLayerTitle,
  isImageryLayerId,
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
 *
 * Origins are compared rather than prefix-matched: `startsWith(API_HOST)` also
 * matches `https://api.staging.globalnaturewatch.org.example.com`, which would
 * hand that host the user's bearer token.
 *
 * Reports back whether the request went to our own API so the caller can tell
 * an expired session from a third-party tiler refusing the request.
 */
async function fetchTileJson(
  url: string
): Promise<{ res: Response; sameOrigin: boolean }> {
  let sameOrigin = false;
  try {
    sameOrigin = new URL(url).origin === new URL(API_CONFIG.API_HOST).origin;
  } catch {
    // Malformed URL — send no credentials and let fetch reject below.
  }
  const res = await fetch(url, { headers: sameOrigin ? getAuthHeaders() : {} });
  return { res, sameOrigin };
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
 * When TileJSON is provided, it is fetched first for the mosaic's bounds and
 * zoom range. Providers without TileJSON may supply bounds / min_zoom /
 * max_zoom directly in the imagery payload instead.
 */
export async function showImageryTool(streamMessage: StreamMessage) {
  const imagery = streamMessage.imagery;
  if (!imagery) return;

  const { addLayer, setLayerVisibility, reorderLayers } =
    useMapStore.getState();

  let tileMetadata: TileJson = {
    bounds: imagery.bounds,
    minzoom: imagery.min_zoom,
    maxzoom: imagery.max_zoom,
  };
  if (imagery.tilejson_url) {
    try {
      const { res, sameOrigin } = await fetchTileJson(imagery.tilejson_url);
      // Only an auth failure against our own API means the session lapsed. The
      // public tiler also answers 401/403 for rate limits and expired mosaics,
      // where telling the user to sign in again sends them down a dead end.
      if (sameOrigin && (res.status === 401 || res.status === 403)) {
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
      tileMetadata = (await res.json()) as TileJson;
    } catch (error) {
      console.error("Failed to load imagery TileJSON:", error);
      return;
    }
  }

  if (
    tileMetadata.minzoom === undefined ||
    tileMetadata.maxzoom === undefined
  ) {
    console.warn(
      "Imagery mosaic is missing min/max zoom limits; not showing layer"
    );
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
    minzoom: tileMetadata.minzoom,
    maxzoom: tileMetadata.maxzoom,
    bounds: tileMetadata.bounds,
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
}
