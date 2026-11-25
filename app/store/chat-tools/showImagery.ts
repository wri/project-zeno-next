import type {
  ChatMessage,
  ImageryInfo,
  InsightWidget,
  StreamMessage,
} from "@/app/types/chat";
import useMapStore from "../mapStore";
import { API_CONFIG } from "@/app/config/api";
import { getAuthHeaders } from "@/app/lib/api-client";
import { showApiError } from "@/app/hooks/useErrorHandler";
import {
  IMAGERY_LAYER_NAME,
  imageryAttribution,
  imageryCardDescription,
  imageryLayerId,
  imageryLayerTitle,
  imageryThumbnailUrl,
  toImageryMeta,
  type ImageryCardData,
} from "@/app/utils/imagery";
import { decodeRecipe } from "@/src/features/imagery";
import {
  isClientImageryEnabled,
  showSentinel2Capture,
} from "../sentinel2Captures";
import { promoteImageryLayer } from "./imageryLayers";

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
 * Handles the show_imagery and show_planet_imagery tools: renders the mosaic
 * from the `imagery` agent-state entry as a raster layer.
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
export async function showImageryTool(
  streamMessage: StreamMessage,
  addMessage?: (message: Omit<ChatMessage, "id">) => void
) {
  const imagery = streamMessage.imagery;
  if (!imagery) return;

  // The "Satellite Imagery" data card in the chat (dataset-card pattern).
  const addCard = (card: ImageryCardData) =>
    addMessage?.({
      type: "widget",
      message: "",
      widgets: [imageryCardWidget(card)],
      timestamp: streamMessage.timestamp,
    });

  // Client rendering: a Sentinel-2 mosaic_id is the recipe token, so the
  // request decodes from it and the browser searches and draws the scenes
  // itself. The backend marks these `render: "client"` and sends no
  // tile_url, so they always take this path. Older Sentinel-2 payloads
  // (with a tile_url) take it too when ?ff=client-imagery is on. Planet,
  // and payloads whose id is not a recipe, keep the tiler path below.
  const isClient = imagery.render === "client";
  if (
    isClient ||
    (isClientImageryEnabled() &&
      (imagery.provider ?? "sentinel-2") === "sentinel-2")
  ) {
    const request = decodeRecipe(imagery.mosaic_id, imagery.aoi_names);
    if (request) {
      // Added before the search: the card follows the capture's layer, so
      // it shows "Searching scenes…" and then the result.
      addCard(imagery);
      await showSentinel2Capture(request, imagery.mosaic_id);
      return;
    }
    if (isClient) {
      console.warn("Client imagery payload without a recipe; not shown");
      return;
    }
  }

  const { addLayer } = useMapStore.getState();

  // Normalize once at the boundary (ImageryLegendMeta's raw nulls/legacy
  // field names never leak past this call) — see toImageryMeta.
  const meta = toImageryMeta(imagery);

  // The backend serialises fields it has no value for as explicit JSON null
  // (see ImageryInfo); normalise to undefined so the checks below hold.
  let tileMetadata: TileJson = {
    bounds: imagery.bounds ?? undefined,
    minzoom: imagery.min_zoom ?? undefined,
    maxzoom: imagery.max_zoom ?? undefined,
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

  if (tileMetadata.minzoom == null || tileMetadata.maxzoom == null) {
    console.warn(
      "Imagery mosaic is missing min/max zoom limits; not showing layer"
    );
    return;
  }

  const id = imageryLayerId(imagery.mosaic_id);

  addLayer({
    id,
    name: imageryLayerTitle(meta.targetDate),
    type: "raster",
    visible: true,
    tileUrl: imagery.tile_url ?? undefined,
    minzoom: tileMetadata.minzoom,
    maxzoom: tileMetadata.maxzoom,
    bounds: tileMetadata.bounds,
    attribution: imageryAttribution(meta.provider),
    startDate: meta.startDate,
    endDate: meta.endDate,
    imagery,
  });

  // Newest capture wins: earlier captures are hidden (not removed) and the
  // new one moves to the top of the imagery group.
  promoteImageryLayer(id);

  // Only once the layer is on the map, so the card never advertises imagery
  // the map does not show.
  addCard({
    ...imagery,
    thumbnail_url: imagery.tile_url
      ? imageryThumbnailUrl(
          imagery.tile_url,
          tileMetadata.bounds,
          tileMetadata.minzoom,
          tileMetadata.maxzoom
        )
      : undefined,
  });

  // No camera movement here: the viewport was already positioned by
  // pick_aoi, and re-fitting to the mosaic bounds would yank the map
  // away from wherever the user is looking.
}

function imageryCardWidget(card: ImageryCardData): InsightWidget {
  return {
    type: "imagery-card",
    title: IMAGERY_LAYER_NAME,
    description: imageryCardDescription(toImageryMeta(card as ImageryInfo)),
    data: card,
    xAxis: "",
    yAxis: "",
  };
}
