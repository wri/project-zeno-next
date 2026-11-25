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
    /** Share of the MGRS tile outside the swath (no data), in percent. */
    "s2:nodata_pixel_percentage"?: number;
    "grid:code"?: string;
    "proj:epsg"?: number;
    [key: string]: unknown;
  };
  assets: Record<
    string,
    | {
        href: string;
        "proj:transform"?: number[];
        "proj:shape"?: number[];
      }
    | undefined
  >;
}

export interface Scene {
  id: string;
  bbox: [number, number, number, number];
  /** ISO datetime of acquisition. */
  datetime: string;
  /** Cloud cover of the scene's valid pixels, in percent. */
  cloudCover: number;
  /**
   * Share of the tile with no data, in percent: a tile at a swath edge is
   * only partly imaged. Absent (read as 0) in scenes saved before it was
   * added, e.g. in dashboard widgets.
   */
  nodata?: number;
  /** MGRS tile, e.g. "MGRS-20LNP". Several scenes can share one tile. */
  gridCode: string;
  /** The 8-bit true-colour COG (`visual` asset). */
  visualHref: string;
  thumbnailHref?: string;
  /** EPSG code of the scene's UTM zone, e.g. 32720. */
  epsg?: number;
  /**
   * The tile's extent in its UTM projection, [minX, minY, maxX, maxY] in
   * metres. The preview image (thumbnailHref) covers exactly this extent.
   */
  extent?: [number, number, number, number];
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
 * the total at `maxScenes`. The cap drops the worst ranks first, so every
 * tile keeps its best scene before any tile gets a second one: covering the
 * whole area comes first.
 *
 * `sort` decides "best": "cloud" (default) is the largest clear share of
 * the tile first (clearShare: cloud and nodata), then nearest the target
 * date; "date" is nearest the date first, then the largest clear share.
 */
export function selectScenes(
  items: StacItem[],
  targetDate: string,
  limits: Pick<SceneLimits, "maxScenesPerTile" | "maxScenes"> = SCENE_LIMITS,
  sort: SceneSort = DEFAULT_SORT
): Scene[] {
  const target = Date.parse(`${targetDate}T12:00:00Z`);
  const candidates = itemsToScenes(items);
  const daysFromTarget = (scene: Scene) =>
    Math.round(Math.abs(Date.parse(scene.datetime) - target) / DAY_MS);
  const byDate = (a: Scene, b: Scene) => daysFromTarget(a) - daysFromTarget(b);
  // Whole percent of the tile, so near-equal scenes fall through to the
  // next criterion.
  const byClear = (a: Scene, b: Scene) =>
    Math.round(clearShare(b)) - Math.round(clearShare(a));
  candidates.sort(
    (a, b) =>
      (sort === "date"
        ? byDate(a, b) || byClear(a, b)
        : byClear(a, b) || byDate(a, b)) || a.id.localeCompare(b.id)
  );

  // Each tile's scenes in that order; the fill scenes prefer footprints the
  // tile's chosen scenes do not have yet (see pickForTile).
  const byTile = new Map<string, Scene[]>();
  for (const scene of candidates) {
    const list = byTile.get(scene.gridCode);
    if (list) list.push(scene);
    else byTile.set(scene.gridCode, [scene]);
  }
  const ranked: Scene[] = [];
  for (const scene of candidates) {
    const list = byTile.get(scene.gridCode);
    if (!list) continue;
    byTile.delete(scene.gridCode);
    pickForTile(list, limits.maxScenesPerTile).forEach((picked, rank) =>
      ranked.push({ ...picked, rank })
    );
  }

  // Within one rank, the order above is kept: the total cap drops the
  // worst scenes of the worst rank.
  const order = new Map(candidates.map((scene, index) => [scene.id, index]));
  return ranked
    .sort((a, b) => a.rank - b.rank || order.get(a.id)! - order.get(b.id)!)
    .slice(0, limits.maxScenes);
}

/**
 * The items as scenes (rank 0), in search order. Items with no visual COG,
 * bbox or date are left out: the map cannot draw them.
 */
export function itemsToScenes(items: StacItem[]): Scene[] {
  return items.flatMap((item): Scene[] => {
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
        nodata: item.properties["s2:nodata_pixel_percentage"] ?? 0,
        gridCode: item.properties["grid:code"] ?? item.id,
        visualHref,
        thumbnailHref: item.assets.thumbnail?.href,
        epsg: item.properties["proj:epsg"],
        extent: assetExtent(item.assets.visual),
        rank: 0,
      },
    ];
  });
}

/**
 * The share of its MGRS tile a scene shows clear ground in, in percent:
 * imaged (not nodata) and not cloudy. A scene from a swath edge can be
 * cloud-free and still image only a sliver of the tile.
 */
export function clearShare(scene: Pick<Scene, "nodata" | "cloudCover">) {
  return ((100 - (scene.nodata ?? 0)) * (100 - scene.cloudCover)) / 100;
}

/** Two scenes' nodata shares differ by more than this: other footprints. */
const FOOTPRINT_DIFF = 5;

/**
 * Up to `max` scenes of one tile, best first (`scenes` is in rank order).
 * After the first, a partial scene's fill should come from another swath:
 * a scene of the same orbit has the same gap. Scenes of one swath have
 * about the same nodata share, so the next scenes prefer a nodata share
 * unlike any chosen one. A full first scene needs no such fill.
 */
function pickForTile(scenes: Scene[], max: number): Scene[] {
  const picked: Scene[] = [];
  const rest = [...scenes];
  while (picked.length < max && rest.length > 0) {
    const needsFill = picked.some((p) => (p.nodata ?? 0) > FOOTPRINT_DIFF);
    const index = needsFill
      ? rest.findIndex((s) =>
          picked.every(
            (p) => Math.abs((s.nodata ?? 0) - (p.nodata ?? 0)) > FOOTPRINT_DIFF
          )
        )
      : -1;
    picked.push(...rest.splice(index === -1 ? 0 : index, 1));
  }
  return picked;
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

/**
 * An asset's extent from its affine transform and shape (projection
 * extension): [minX, minY, maxX, maxY] in the asset's CRS.
 */
function assetExtent(
  asset: StacItem["assets"][string]
): [number, number, number, number] | undefined {
  const t = asset?.["proj:transform"];
  const shape = asset?.["proj:shape"];
  if (!t || t.length < 6 || !shape || shape.length < 2) return undefined;
  const [xRes, , x0, , yRes, y0] = t;
  const [rows, cols] = shape;
  const x1 = x0 + xRes * cols;
  const y1 = y0 + yRes * rows;
  return [
    Math.min(x0, x1),
    Math.min(y0, y1),
    Math.max(x0, x1),
    Math.max(y0, y1),
  ];
}
