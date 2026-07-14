import { format, parseISO } from "date-fns";

import type { LegendParam } from "./types";

/**
 * Sentinel-2 mosaic metadata that drives an imagery legend entry — the
 * ImageryState payload the show_imagery tool writes to agent state, whether
 * carried on an explorer map layer or snapshotted into a dashboard map
 * widget's config. Field names follow the wire format (snake_case) so both
 * consumers can pass their payloads through unmapped.
 *
 * Everything is optional: item_count / date_start / date_end are only known
 * when the mosaic is built (absent on a cache hit), and payloads created
 * before a field existed simply lack it. Builders below omit whatever is
 * missing rather than failing.
 */
export interface ImageryLegendMeta {
  item_count?: number;
  date_start?: string;
  date_end?: string;
  target_date?: string;
  window_days?: number;
  max_cloud_cover?: number;
  aoi_names?: string[];
}

export const IMAGERY_LAYER_NAME = "Satellite imagery";

// Backend default for show_imagery's max_cloud_cover; anything above it
// means the agent loosened the search and clouds are expected.
export const IMAGERY_DEFAULT_MAX_CLOUD_COVER = 20;

function formatImageryDate(isoDate: string): string {
  try {
    return format(parseISO(isoDate), "MMM d, yyyy");
  } catch {
    return isoDate;
  }
}

// Compact acquired-date range, e.g. "May 28 – Jun 3, 2024": the start date's
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

/** Legend/layer title, e.g. "Satellite imagery (Jun 1, 2024)". */
export function imageryLayerTitle(targetDate?: string): string {
  if (!targetDate) return IMAGERY_LAYER_NAME;
  try {
    return `${IMAGERY_LAYER_NAME} (${format(parseISO(targetDate), "MMM d, yyyy")})`;
  } catch {
    return IMAGERY_LAYER_NAME;
  }
}

/**
 * The read-only chips under an imagery legend title. Each chip is omitted
 * when its metadata is missing (cache hits, pre-fields payloads).
 */
export function imageryLegendParams(meta: ImageryLegendMeta): LegendParam[] {
  const params: LegendParam[] = [];
  if (meta.date_start && meta.date_end) {
    params.push({
      label: "DATES",
      value: formatImageryDateRange(meta.date_start, meta.date_end),
      // Wide enough for a cross-year range ("Dec 28, 2023 – Jan 4, 2024");
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
  return `Sentinel-2 true-colour mosaic${scenes}${closest}. Contains modified Copernicus Sentinel data.`;
}

/**
 * A cautionary note shown when the search ran above the default cloud-cover
 * limit — partly obscured imagery is then expected and shouldn't read as a
 * rendering bug. Undefined when the default (or a stricter) limit applied.
 */
export function imageryLegendCloudNote(
  meta: ImageryLegendMeta
): string | undefined {
  if (
    meta.max_cloud_cover === undefined ||
    meta.max_cloud_cover <= IMAGERY_DEFAULT_MAX_CLOUD_COVER
  ) {
    return undefined;
  }
  return `Searched with a loosened cloud-cover limit (${meta.max_cloud_cover}%) — imagery may contain clouds.`;
}
