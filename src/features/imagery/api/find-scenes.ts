import type { FeatureCollection } from "geojson";
import { areaKm2, buildSearchBody, searchGeometry } from "../lib/search";
import { encodeRecipe, type Sentinel2Request } from "../model/request";
import {
  SCENE_LIMITS,
  selectScenes,
  summarizeScenes,
  type CaptureStatus,
  type Scene,
  type SceneLimits,
  type SceneSummary,
} from "../model/scenes";
import { searchStac } from "./earth-search";

export interface SceneSearchResult {
  status: Exclude<CaptureStatus, "searching">;
  scenes: Scene[];
  summary: SceneSummary;
  /** Items the STAC search returned, before the scene limits. */
  found: number;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

// One search per recipe per session: thread replay, the legend preview and
// re-applying the same filters all reuse it. Failed searches are dropped so
// a retry runs again.
const cache = new Map<string, Promise<SceneSearchResult>>();

/**
 * Search earth-search for a request's scenes over its AOI and apply the
 * scene limits. Never rejects: an error is a result with status "error".
 */
export function findScenes(
  request: Sentinel2Request,
  aoi: FeatureCollection,
  limits: SceneLimits = SCENE_LIMITS
): Promise<SceneSearchResult> {
  const key = encodeRecipe(request);
  const cached = cache.get(key);
  if (cached) return cached;

  const run = async (): Promise<SceneSearchResult> => {
    const empty = { scenes: [], summary: { itemCount: 0 }, found: 0 };
    if (areaKm2(aoi) > limits.maxAreaKm2) {
      return { status: "too_large", ...empty };
    }
    const geometry = searchGeometry(aoi);
    if (!geometry) return { status: "error", ...empty };
    const items = await searchStac(
      buildSearchBody(request, geometry, todayIso()),
      request.maxItems
    );
    const scenes = selectScenes(
      items,
      request.targetDate,
      limits,
      request.sort
    );
    return {
      status: scenes.length > 0 ? "ok" : "no_scenes",
      scenes,
      summary: summarizeScenes(scenes),
      found: items.length,
    };
  };

  const promise = run().catch((error: unknown) => {
    console.warn("Sentinel-2 scene search failed", error);
    cache.delete(key);
    return {
      status: "error" as const,
      scenes: [],
      summary: { itemCount: 0 },
      found: 0,
    };
  });
  cache.set(key, promise);
  return promise;
}
