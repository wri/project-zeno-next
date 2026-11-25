/**
 * A Sentinel-2 imagery request: which areas, around which date, how wide a
 * search window and how cloudy a scene may be. It is the one input of the
 * client-side imagery path, whatever produced it (the agent's show_imagery
 * payload, the imagery focus editor, and later the agent's client payload).
 */

/** An area by its backend reference, as the geometry endpoint takes it. */
export interface AoiRef {
  source: string;
  srcId: string;
}

export interface Sentinel2Request {
  aois: AoiRef[];
  /** Display names, in `aois` order. Not part of the identity. */
  aoiNames: string[];
  /** YYYY-MM-DD: the date the imagery should be closest to. */
  targetDate: string;
  /** The search covers targetDate ± windowDays. */
  windowDays: number;
  /** Scenes with this much cloud cover (%) or more are left out. */
  maxCloudCover: number;
  /**
   * The backend's item cap. Part of the recipe token, so a token stays equal
   * to the backend's, but the browser does not cap its search with it: a
   * cap cuts whole MGRS tiles out of the result (see SEARCH_ITEM_CAP).
   */
  maxItems: number;
  /**
   * Which scenes win: "cloud" (default) puts the least cloudy scenes of the
   * window on top, so cloudy regions still get full coverage; "date" puts
   * the scenes nearest the target date on top. Optional: absent means the
   * default, as in every token the backend writes.
   */
  sort?: SceneSort;
}

export type SceneSort = "cloud" | "date";
export const DEFAULT_SORT: SceneSort = "cloud";
/** How each scene ranking reads in the legend. */
export const SORT_LABELS: Record<SceneSort, string> = {
  cloud: "Least cloudy",
  date: "Nearest date",
};
/** Sort choices offered in the legend. */
export const SORT_OPTIONS: readonly SceneSort[] = ["cloud", "date"];

/** Window choices offered in the legend, in days. */
// ±3 d is one week (7 days searched), the shortest window offered.
export const WINDOW_OPTIONS = [3, 7, 15, 30, 60] as const;
/** Cloud-cover choices offered in the legend, in percent. */
// 100 % means no cloud filter at all (buildSearchBody).
export const CLOUD_OPTIONS = [10, 20, 30, 50, 80, 100] as const;

/** The backend defaults of show_imagery (src/agent/imagery/sentinel2.py). */
export const DEFAULT_WINDOW_DAYS = 7;
// Loose on purpose: scenes are ranked least cloudy first, so a high limit
// only adds fallback scenes for tiles that have no clearer one.
export const DEFAULT_MAX_CLOUD_COVER = 50;
export const DEFAULT_MAX_ITEMS = 50;

/**
 * The oldest scene in earth-search's sentinel-2-l2a collection (checked
 * 2026-11-25). The collection extent says 2015-06-27, but no item is older.
 */
export const FIRST_SCENE_DATE = "2016-11-01";

/**
 * The request show_imagery makes when the user gives no date: about the past
 * two weeks (target one week ago, ±7 days), less than 50 % cloud, least
 * cloudy first. Used by the area menu's "Show satellite imagery".
 */
export function defaultRequest(
  aois: AoiRef[],
  aoiNames: string[],
  today: string
): Sentinel2Request {
  return {
    aois,
    aoiNames,
    targetDate: shiftIsoDate(today, -DEFAULT_WINDOW_DAYS),
    windowDays: DEFAULT_WINDOW_DAYS,
    maxCloudCover: DEFAULT_MAX_CLOUD_COVER,
    maxItems: DEFAULT_MAX_ITEMS,
    sort: DEFAULT_SORT,
  };
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(Math.round(value), min), max);

/** The same limits the backend applies (decode_recipe in src/shared/imagery_recipe.py). */
export function normalizeRequest(request: Sentinel2Request): Sentinel2Request {
  return {
    ...request,
    windowDays: clamp(request.windowDays, 1, 183),
    maxCloudCover: clamp(request.maxCloudCover, 1, 100),
    maxItems: clamp(request.maxItems, 1, 100),
    sort: request.sort ?? DEFAULT_SORT,
  };
}

// Python's json.dumps escapes every non-ASCII character as \uXXXX (lowercase
// hex, UTF-16 code units); JSON.stringify does not. Do the same so a token
// built here equals the backend's for the same request.
const escapeNonAscii = (json: string): string =>
  json.replace(
    /[\u0080-￿]/g,
    (ch) => `\\u${ch.charCodeAt(0).toString(16).padStart(4, "0")}`
  );

const toBase64Url = (ascii: string): string =>
  btoa(ascii).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const fromBase64Url = (token: string): string =>
  atob(
    token.replace(/-/g, "+").replace(/_/g, "/") +
      "=".repeat((4 - (token.length % 4)) % 4)
  );

/**
 * The recipe token of a request: the backend's `encode_recipe` (base64url of
 * the key-sorted, compact recipe JSON). The token is the capture's identity:
 * the same request gives the same token, so re-running it upserts the same
 * map layer, and a token from the agent matches one built here.
 */
export function encodeRecipe(request: Sentinel2Request): string {
  const r = normalizeRequest(request);
  // Keys in sorted order, as json.dumps(sort_keys=True) writes them.
  const payload: Record<string, unknown> = {
    a: r.aois.map((aoi) => [aoi.source, aoi.srcId]),
    c: r.maxCloudCover,
    d: r.targetDate,
    n: r.maxItems,
    // Only the non-default sort is written, so a default request's token
    // equals the backend's (which never sets a sort).
    ...(r.sort !== DEFAULT_SORT ? { s: r.sort } : {}),
    w: r.windowDays,
  };
  return toBase64Url(escapeNonAscii(JSON.stringify(payload)));
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The request a recipe token stands for, or null when the token is not a
 * recipe (a Planet mosaic id, a malformed or older token).
 */
export function decodeRecipe(
  token: string,
  aoiNames: string[] = []
): Sentinel2Request | null {
  try {
    const payload = JSON.parse(fromBase64Url(token));
    const aois = payload.a;
    if (
      !Array.isArray(aois) ||
      aois.length === 0 ||
      !aois.every(
        (pair: unknown) =>
          Array.isArray(pair) &&
          pair.length === 2 &&
          typeof pair[0] === "string" &&
          // Older backend tokens can carry a numeric src_id.
          (typeof pair[1] === "string" || typeof pair[1] === "number")
      ) ||
      typeof payload.d !== "string" ||
      !ISO_DATE.test(payload.d)
    ) {
      return null;
    }
    const numberOr = (value: unknown, fallback: number) =>
      typeof value === "number" && Number.isFinite(value) ? value : fallback;
    return normalizeRequest({
      aois: aois.map(([source, srcId]: [string, string | number]) => ({
        source,
        srcId: String(srcId),
      })),
      aoiNames,
      targetDate: payload.d,
      windowDays: numberOr(payload.w, DEFAULT_WINDOW_DAYS),
      maxCloudCover: numberOr(payload.c, DEFAULT_MAX_CLOUD_COVER),
      maxItems: numberOr(payload.n, DEFAULT_MAX_ITEMS),
      sort: payload.s === "date" ? "date" : DEFAULT_SORT,
    });
  } catch {
    return null;
  }
}

/** Shift an ISO date by whole days (UTC, so no time-zone drift). */
export function shiftIsoDate(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * The searched date range: targetDate ± windowDays, the end clamped to
 * `today` (the backend does the same; there are no future scenes).
 */
export function searchRange(
  request: Sentinel2Request,
  today: string
): { start: string; end: string } {
  const start = shiftIsoDate(request.targetDate, -request.windowDays);
  const end = shiftIsoDate(request.targetDate, request.windowDays);
  return { start, end: end < today ? end : today };
}
