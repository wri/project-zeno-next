import { format, parseISO } from "date-fns";

import type { ImageryInfo } from "@/app/types/chat";
import type { LegendParam } from "@/app/components/legend/types";

/**
 * Metadata driving an imagery legend entry — the ImageryState payload the
 * show_imagery tool writes to agent state, whether carried on an explorer map
 * layer or snapshotted into a dashboard map widget's config. Field names
 * follow the wire format (snake_case) so both consumers can pass their
 * payloads through unmapped.
 *
 * Everything is optional: payloads created before a field existed simply lack
 * it (item_count / date_start / date_end were omitted on mosaic cache hits
 * before wri/project-zeno#758). Builders below omit whatever is missing
 * rather than failing.
 */
export type ImageryLegendMeta = Partial<
  Pick<
    ImageryInfo,
    | "item_count"
    | "date_start"
    | "date_end"
    | "mean_cloud_cover"
    | "min_cloud_cover"
    | "max_cloud_cover_observed"
    | "target_date"
    | "window_days"
    | "max_cloud_cover"
    | "aoi_names"
  >
>;

export const IMAGERY_LAYER_ID_PREFIX = "imagery-";
export const IMAGERY_LEGEND_GROUP_ID = "imagery-group";
export const IMAGERY_LAYER_NAME = "Satellite Imagery";
export const IMAGERY_SUBTITLE = "Sentinel-2 · True-colour";
export const IMAGERY_ATTRIBUTION = "Contains modified Copernicus Sentinel data";

// Backend default for show_imagery's max_cloud_cover; anything above it
// means the agent loosened the search and clouds are expected.
export const IMAGERY_DEFAULT_MAX_CLOUD_COVER = 20;

export function imageryLayerId(mosaicId: string): string {
  return `${IMAGERY_LAYER_ID_PREFIX}${mosaicId}`;
}

export function isImageryLayerId(id: string): boolean {
  return id.startsWith(IMAGERY_LAYER_ID_PREFIX);
}

function formatImageryDate(isoDate: string): string {
  try {
    return format(parseISO(isoDate), "MMM d, yyyy");
  } catch {
    return isoDate;
  }
}

// Compact acquired-date range, e.g. "May 28 – Jun 3, 2026": the start date's
// year is elided within a single year so the chip survives the dashboard
// legend's 300px width without truncating away the end date.
function formatImageryDateRange(startIso: string, endIso: string): string {
  try {
    const start = parseISO(startIso);
    const end = parseISO(endIso);
    const startLabel =
      format(start, "yyyy") === format(end, "yyyy")
        ? format(start, "MMM d")
        : format(start, "MMM d, yyyy");
    return `${startLabel} – ${format(end, "MMM d, yyyy")}`;
  } catch {
    return `${formatImageryDate(startIso)} – ${formatImageryDate(endIso)}`;
  }
}

/** Capture-row date per the Figma spec, e.g. "15 Jun 2026". */
export function formatCaptureDate(isoDate: string): string {
  try {
    return format(parseISO(isoDate), "d MMM yyyy");
  } catch {
    return isoDate;
  }
}

/** Legend/layer title, e.g. "Satellite Imagery (Jun 15, 2026)". */
export function imageryLayerTitle(targetDate?: string): string {
  if (!targetDate) return IMAGERY_LAYER_NAME;
  return `${IMAGERY_LAYER_NAME} (${formatImageryDate(targetDate)})`;
}

/**
 * The read-only chips under an imagery legend title. Each chip is omitted
 * when its metadata is missing (pre-#758 cache hits, old payloads).
 */
export function imageryLegendParams(meta: ImageryLegendMeta): LegendParam[] {
  const params: LegendParam[] = [];
  if (meta.date_start && meta.date_end) {
    params.push({
      label: "DATES",
      value: formatImageryDateRange(meta.date_start, meta.date_end),
      // Wide enough for a cross-year range ("Dec 28, 2025 – Jan 4, 2026");
      // the default 15ch would hide the end date behind an ellipsis.
      maxValueWidth: "26ch",
    });
  }
  if (meta.window_days !== undefined) {
    params.push({ label: "WINDOW", value: `±${meta.window_days} days` });
  }
  if (meta.max_cloud_cover !== undefined) {
    params.push({ label: "CLOUD", value: `< ${meta.max_cloud_cover}%` });
  }
  if (meta.aoi_names && meta.aoi_names.length > 0) {
    params.push({ label: "AREA", value: meta.aoi_names.join(", ") });
  }
  return params;
}

/** The info-popover sentence for an imagery legend entry. */
export function imageryLegendInfo(meta: ImageryLegendMeta): string {
  const scenes =
    meta.item_count !== undefined
      ? ` built from ${meta.item_count} scene${meta.item_count === 1 ? "" : "s"}`
      : "";
  const closest = meta.target_date
    ? ` closest to ${formatImageryDate(meta.target_date)}`
    : "";
  const observed =
    meta.mean_cloud_cover !== undefined
      ? ` Mean observed cloud cover ${Math.round(meta.mean_cloud_cover)}%.`
      : "";
  return `Sentinel-2 true-colour mosaic${scenes}${closest}.${observed} ${IMAGERY_ATTRIBUTION}.`;
}

/**
 * A cautionary note shown when the search ran above the default cloud-cover
 * limit — partly obscured imagery is then expected and shouldn't read as a
 * rendering bug. Undefined when the default (or a stricter) limit applied.
 */
export function imageryCloudNote(meta: ImageryLegendMeta): string | undefined {
  if (
    meta.max_cloud_cover === undefined ||
    meta.max_cloud_cover <= IMAGERY_DEFAULT_MAX_CLOUD_COVER
  ) {
    return undefined;
  }
  return `Searched with a loosened cloud-cover limit (${meta.max_cloud_cover}%) — imagery may contain clouds.`;
}

/** Capture-row meta line, e.g. "cloud <50% · 9 scenes". */
export function captureMetaLabel(meta: ImageryLegendMeta): string {
  const parts: string[] = [];
  if (meta.max_cloud_cover !== undefined) {
    parts.push(`cloud <${meta.max_cloud_cover}%`);
  }
  if (meta.item_count !== undefined) {
    parts.push(`${meta.item_count} scene${meta.item_count === 1 ? "" : "s"}`);
  }
  return parts.join(" · ");
}

/**
 * A single-tile preview URL for a mosaic, used as the legend/card thumbnail.
 * Picks the zoom whose tile is just smaller than the mosaic's extent (so the
 * preview is filled with imagery rather than empty margins), clamped to the
 * mosaic's zoom range, and takes the tile at the extent's centre.
 */
export function imageryThumbnailUrl(
  tileUrl: string,
  bounds?: [number, number, number, number],
  minzoom = 0,
  maxzoom = 22
): string | undefined {
  if (!bounds) return undefined;
  const [west, south, east, north] = bounds;
  const crossesDateline = west > east;
  const lonSpan = crossesDateline ? 360 - west + east : east - west;
  const latSpan = north - south;
  const maxSpan = Math.max(lonSpan, latSpan);
  if (!(maxSpan > 0)) return undefined;

  const zoom = Math.min(
    Math.max(Math.ceil(Math.log2(360 / maxSpan)), minzoom),
    maxzoom
  );

  let lonCenter = west + lonSpan / 2;
  if (lonCenter > 180) lonCenter -= 360;
  const latCenter = (south + north) / 2;

  const n = 2 ** zoom;
  const x = Math.min(Math.floor(((lonCenter + 180) / 360) * n), n - 1);
  const latRad = (latCenter * Math.PI) / 180;
  const y = Math.min(
    Math.max(
      Math.floor(
        ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) /
          2) *
          n
      ),
      0
    ),
    n - 1
  );

  return tileUrl
    .replace("{z}", String(zoom))
    .replace("{x}", String(x))
    .replace("{y}", String(y));
}
