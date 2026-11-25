import { DEFAULT_SORT, type SceneSort } from "./request";

/**
 * Scene selection for a client-rendered Sentinel-2 capture: which of the STAC
 * search results the browser opens, in which order, and what the legend says
 * about them.
 */

/** The parts of an earth-search STAC item the imagery path reads. */
export interface StacItem {
  id: string;
  bbox?: number[];
  properties: {
    datetime?: string;
    "eo:cloud_cover"?: number;
    "grid:code"?: string;
    [key: string]: unknown;
  };
  assets: Record<string, { href: string } | undefined>;
}

export interface Scene {
  id: string;
  bbox: [number, number, number, number];
  /** ISO datetime of acquisition. */
  datetime: string;
  cloudCover: number;
  /** MGRS tile, e.g. "MGRS-20LNP". Several scenes can share one tile. */
  gridCode: string;
  /** The 8-bit true-colour COG (`visual` asset). */
  visualHref: string;
  thumbnailHref?: string;
  /**
   * 0 for the best scene of its MGRS tile, 1 for the next, and so on. The
   * map draws rank 0 on top; higher ranks only fill its nodata gaps.
   */
  rank: number;
}

/**
 * Limits on how much the browser opens. Speed depends on the number of COGs
 * in view; the spike (project-zeno docs/sentinel-imagery-client-rendering-plan.md)
 * measured ~10 s to settle at 14 scenes and ~20 s at 36 on a 48,000 km² area.
 */
export interface SceneLimits {
  /** Best scenes kept per MGRS tile. More only fill nodata gaps. */
  maxScenesPerTile: number;
  /** Scenes kept in total, worst ranks dropped first. */
  maxScenes: number;
  /** Areas larger than this are not searched. */
  maxAreaKm2: number;
  /** Below this map zoom no imagery is drawn (ImageryZoomHint explains it). */
  minZoom: number;
}

export const SCENE_LIMITS: SceneLimits = {
  maxScenesPerTile: 2,
  maxScenes: 24,
  maxAreaKm2: 50_000,
  minZoom: 8,
};

const DAY_MS = 86_400_000;

/**
 * Rank the items, keep the best `maxScenesPerTile` per MGRS tile, then cap
 * the total at `maxScenes`. The cap drops the worst ranks first, so no tile
 * loses its best scene to another tile's second-best.
 *
 * `sort` decides "best": "cloud" (default) is least cloudy first, then
 * nearest the target date; "date" is nearest the date first, then least
 * cloudy (what the backend mosaic did).
 */
export function selectScenes(
  items: StacItem[],
  targetDate: string,
  limits: Pick<SceneLimits, "maxScenesPerTile" | "maxScenes"> = SCENE_LIMITS,
  sort: SceneSort = DEFAULT_SORT
): Scene[] {
  const target = Date.parse(`${targetDate}T12:00:00Z`);
  const candidates = items.flatMap((item): Scene[] => {
    const visualHref = item.assets.visual?.href;
    const bbox = item.bbox;
    const datetime = item.properties.datetime;
    if (!visualHref || !bbox || bbox.length < 4 || !datetime) return [];
    return [
      {
        id: item.id,
        bbox: [bbox[0], bbox[1], bbox[2], bbox[3]],
        datetime,
        cloudCover: item.properties["eo:cloud_cover"] ?? 100,
        gridCode: item.properties["grid:code"] ?? item.id,
        visualHref,
        thumbnailHref: item.assets.thumbnail?.href,
        rank: 0,
      },
    ];
  });
  const daysFromTarget = (scene: Scene) =>
    Math.round(Math.abs(Date.parse(scene.datetime) - target) / DAY_MS);
  const byDate = (a: Scene, b: Scene) => daysFromTarget(a) - daysFromTarget(b);
  const byCloud = (a: Scene, b: Scene) => a.cloudCover - b.cloudCover;
  candidates.sort(
    (a, b) =>
      (sort === "date"
        ? byDate(a, b) || byCloud(a, b)
        : byCloud(a, b) || byDate(a, b)) || a.id.localeCompare(b.id)
  );

  const perTile = new Map<string, number>();
  const ranked: Scene[] = [];
  for (const scene of candidates) {
    const rank = perTile.get(scene.gridCode) ?? 0;
    if (rank >= limits.maxScenesPerTile) continue;
    perTile.set(scene.gridCode, rank + 1);
    ranked.push({ ...scene, rank });
  }

  // Stable: within one rank, the date/cloud order above is kept.
  return ranked
    .map((scene, order) => ({ scene, order }))
    .sort((a, b) => a.scene.rank - b.scene.rank || a.order - b.order)
    .slice(0, limits.maxScenes)
    .map(({ scene }) => scene);
}

/** What the legend and the agent's view context say about a capture. */
export interface SceneSummary {
  itemCount: number;
  startDate?: string;
  endDate?: string;
  meanCloudCover?: number;
  minCloudCover?: number;
  maxCloudCover?: number;
}

export function summarizeScenes(scenes: Scene[]): SceneSummary {
  if (scenes.length === 0) return { itemCount: 0 };
  const dates = scenes.map((s) => s.datetime.slice(0, 10)).sort();
  const clouds = scenes.map((s) => s.cloudCover);
  const mean = clouds.reduce((sum, c) => sum + c, 0) / clouds.length;
  return {
    itemCount: scenes.length,
    startDate: dates[0],
    endDate: dates[dates.length - 1],
    meanCloudCover: Math.round(mean * 100) / 100,
    minCloudCover: Math.min(...clouds),
    maxCloudCover: Math.max(...clouds),
  };
}

/**
 * The state of one capture's scene search. `searching` until the STAC search
 * returns; `too_large` when the area is above `maxAreaKm2` (no search runs).
 */
export type CaptureStatus =
  | "searching"
  | "ok"
  | "no_scenes"
  | "too_large"
  | "error";
