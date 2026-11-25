import turfBbox from "@turf/bbox";
import type { FeatureCollection } from "geojson";
import {
  CLIENT_IMAGERY_FLAG,
  SCENE_LIMITS,
  encodeRecipe,
  findScenes,
  toFeatureCollection,
  type ScenePreview,
  type Sentinel2Request,
} from "@/src/features/imagery";
import { isFeatureEnabled } from "@/src/shared/lib/feature-flags";
import type { ImageryInfo } from "@/app/types/chat";
import { fetchGeometry } from "@/app/utils/geometryClient";
import {
  imageryAttribution,
  imageryLayerId,
  imageryLayerTitle,
} from "@/app/utils/imagery";
import useMapStore from "./mapStore";
import { promoteImageryLayer } from "./chat-tools/imageryLayers";

/**
 * Client-rendered Sentinel-2 captures: the browser searches earth-search and
 * deck.gl draws the scenes' COGs (Sentinel2Layers in Map.tsx). Replaces the
 * backend's S3 mosaic + GFW tiler path while `?ff=client-imagery` is on.
 */

export function isClientImageryEnabled(): boolean {
  return (
    typeof window !== "undefined" &&
    isFeatureEnabled(
      new URLSearchParams(window.location.search),
      CLIENT_IMAGERY_FLAG
    )
  );
}

/**
 * The request's AOIs as one FeatureCollection: from the map's geometry
 * registry when pick_aoi already loaded them, else from the geometry API.
 */
async function loadAoiGeometry(
  request: Sentinel2Request
): Promise<FeatureCollection> {
  const registry = useMapStore.getState().geoJsonRegistry;
  const shapes = await Promise.all(
    request.aois.map(async ({ source, srcId }) => {
      const entry = registry.find(
        (e) => e.ref.source === source && (e.ref.srcId ?? e.srcId) === srcId
      );
      if (entry) return entry.data;
      return (await fetchGeometry(source, srcId)).geometry;
    })
  );
  return toFeatureCollection(shapes);
}

/** Legend metadata for a capture, in the agent's ImageryInfo wire shape. */
function imageryInfo(request: Sentinel2Request, mosaicId: string): ImageryInfo {
  return {
    provider: "sentinel-2",
    mosaic_id: mosaicId,
    target_date: request.targetDate,
    window_days: request.windowDays,
    max_cloud_cover: request.maxCloudCover,
    aoi_names: request.aoiNames,
  };
}

/**
 * Add (or re-show) the capture for a request, make it the live capture and
 * search its scenes. The layer appears at once in the "searching" state; the
 * scenes, scene count and dates follow when the search returns. The layer id
 * is the recipe token, so the same request (from the agent or the legend)
 * always upserts the same layer.
 */
export async function showSentinel2Capture(
  request: Sentinel2Request,
  /**
   * The capture's id (recipe token) when it came with one: the agent's
   * mosaic_id. Kept as is, so the chat card finds the layer even when the
   * token does not re-encode identically (e.g. an older numeric src_id).
   */
  token: string = encodeRecipe(request)
): Promise<void> {
  const id = imageryLayerId(token);
  const { addLayer, updateLayer } = useMapStore.getState();
  const existing = useMapStore.getState().layers.find((l) => l.id === id);

  addLayer({
    id,
    name: imageryLayerTitle(request.targetDate),
    type: "raster",
    visible: true,
    opacity: existing?.opacity,
    minzoom: SCENE_LIMITS.minZoom,
    bounds: existing?.bounds,
    attribution: imageryAttribution("sentinel-2"),
    imagery: existing?.imagery ?? imageryInfo(request, token),
    // Re-showing a capture keeps its scenes; a failed one searches again.
    sentinel2:
      existing?.sentinel2 && existing.sentinel2.status !== "error"
        ? existing.sentinel2
        : { request, status: "searching", scenes: [] },
  });
  promoteImageryLayer(id);

  let aoi: FeatureCollection;
  try {
    aoi = await loadAoiGeometry(request);
  } catch (error) {
    console.warn("Imagery AOI geometry unavailable", error);
    updateLayer(id, { sentinel2: { request, status: "error", scenes: [] } });
    return;
  }

  const [west, south, east, north] = turfBbox(aoi);
  // Bounds before the search, so the map can mark the area while it runs.
  updateLayer(id, { bounds: [west, south, east, north] });
  const result = await findScenes(request, aoi);
  const { summary } = result;
  // updateLayer is a no-op if the user removed the capture meanwhile.
  updateLayer(id, {
    bounds: [west, south, east, north],
    sentinel2: { request, status: result.status, scenes: result.scenes },
    imagery: {
      ...imageryInfo(request, token),
      item_count: summary.itemCount,
      start_date: summary.startDate ?? null,
      end_date: summary.endDate ?? null,
      mean_cloud_cover: summary.meanCloudCover ?? null,
      min_cloud_cover: summary.minCloudCover ?? null,
      max_cloud_cover_observed: summary.maxCloudCover ?? null,
    },
  });
}

/** What a request would show, for the legend's Edit popover. */
export async function previewSentinel2(
  request: Sentinel2Request
): Promise<ScenePreview> {
  try {
    const result = await findScenes(request, await loadAoiGeometry(request));
    return {
      status: result.status,
      sceneCount: result.scenes.length,
      found: result.found,
    };
  } catch {
    return { status: "error", sceneCount: 0, found: 0 };
  }
}
