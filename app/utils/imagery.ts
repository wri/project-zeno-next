import { format, parseISO } from "date-fns";

import type { ImageryInfo, ImageryProvider } from "@/app/types/chat";
import type {
  ImageryLegendGroup,
  LegendParam,
} from "@/app/components/legend/types";
import type { Layer } from "@/app/store/layerManagerSlice";

/**
 * Metadata driving an imagery legend entry — the ImageryState payload the
 * show_imagery tool writes to agent state, whether carried on an explorer map
 * layer or snapshotted into a dashboard map widget's config. Field names
 * follow the wire format (snake_case) so both consumers can pass their
 * payloads through unmapped.
 *
 * Everything is optional: payloads created before a field existed simply lack
 * it (item_count / acquired dates were omitted on mosaic cache hits before
 * wri/project-zeno#758), and since wri/project-zeno#800 fields a provider has
 * no value for arrive as explicit JSON null (Planet's monthly basemap has no
 * scene count, cloud stats or search constraints). This raw shape never
 * reaches the legend-string builders directly — `toImageryMeta` is the only
 * function that reads it, collapsing the nulls and legacy field names into
 * `ImageryMeta`.
 */
export type ImageryLegendMeta = Partial<
  Pick<
    ImageryInfo,
    | "provider"
    | "item_count"
    | "start_date"
    | "end_date"
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

/**
 * Fully-normalized imagery metadata used everywhere past the boundary: no
 * wire nulls, no legacy field-name duplication, provider always resolved.
 * `toImageryMeta` is the only function that reads `ImageryLegendMeta`'s raw
 * shape — everything below this line takes `ImageryMeta`.
 */
export interface ImageryMeta {
  provider: ImageryProvider;
  itemCount?: number;
  startDate?: string;
  endDate?: string;
  meanCloudCover?: number;
  targetDate?: string;
  windowDays?: number;
  maxCloudCover?: number;
  aoiNames: string[];
}

/**
 * Normalizes the wire-shaped `ImageryLegendMeta` to `ImageryMeta` — the one
 * place that treats null as absent, coalesces start_date/date_start (and
 * end_date/date_end), and defaults a missing provider to "sentinel-2". Call
 * this once where an imagery payload enters the app (showImageryTool,
 * buildImageryGroup); every other imagery function takes the result, never
 * the raw meta.
 */
export function toImageryMeta(meta: ImageryLegendMeta): ImageryMeta {
  return {
    // Absent on payloads written before wri/project-zeno#800, which were all
    // Sentinel-2.
    provider: meta.provider ?? "sentinel-2",
    itemCount: meta.item_count ?? undefined,
    startDate: meta.start_date ?? meta.date_start ?? undefined,
    endDate: meta.end_date ?? meta.date_end ?? undefined,
    meanCloudCover: meta.mean_cloud_cover ?? undefined,
    targetDate: meta.target_date ?? undefined,
    windowDays: meta.window_days ?? undefined,
    maxCloudCover: meta.max_cloud_cover ?? undefined,
    aoiNames: meta.aoi_names ?? [],
  };
}

const IMAGERY_TOOL_NAMES: readonly string[] = [
  "show_imagery",
  "show_planet_imagery",
];

export function isImageryTool(toolName?: string): boolean {
  return toolName !== undefined && IMAGERY_TOOL_NAMES.includes(toolName);
}

export const IMAGERY_LAYER_ID_PREFIX = "imagery-";
export const IMAGERY_LEGEND_GROUP_ID = "imagery-group";
export const IMAGERY_LAYER_NAME = "Satellite Imagery";

/** Per-provider display strings: legend subtitle, the mosaic noun that opens
 * the info-popover sentence, and the imagery attribution. */
const PROVIDER_DISPLAY: Record<
  ImageryProvider,
  { subtitle: string; mosaicNoun: string; attribution: string }
> = {
  "sentinel-2": {
    subtitle: "Sentinel-2 · True-colour",
    mosaicNoun: "Sentinel-2 true-colour mosaic",
    attribution: "Contains modified Copernicus Sentinel data",
  },
  planet: {
    subtitle: "Planet · Monthly mosaic",
    mosaicNoun: "Planet monthly true-colour mosaic",
    attribution: "Imagery © Planet Labs PBC",
  },
};

function providerDisplay(provider: ImageryProvider) {
  return PROVIDER_DISPLAY[provider];
}

/** Legend subtitle for a provider, e.g. "Sentinel-2 · True-colour". */
export function imagerySubtitle(provider: ImageryProvider): string {
  return providerDisplay(provider).subtitle;
}

/** Map-attribution line for a provider's imagery. */
export function imageryAttribution(provider: ImageryProvider): string {
  return providerDisplay(provider).attribution;
}

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
export function imageryLegendParams(meta: ImageryMeta): LegendParam[] {
  const params: LegendParam[] = [];
  if (meta.startDate && meta.endDate) {
    params.push({
      label: "DATES",
      value: formatImageryDateRange(meta.startDate, meta.endDate),
      // Wide enough for a cross-year range ("Dec 28, 2025 – Jan 4, 2026");
      // the default 15ch would hide the end date behind an ellipsis.
      maxValueWidth: "26ch",
    });
  }
  if (meta.windowDays !== undefined) {
    params.push({ label: "WINDOW", value: `±${meta.windowDays} days` });
  }
  if (meta.maxCloudCover !== undefined) {
    params.push({ label: "CLOUD", value: `< ${meta.maxCloudCover}%` });
  }
  if (meta.aoiNames.length > 0) {
    params.push({ label: "AREA", value: meta.aoiNames.join(", ") });
  }
  return params;
}

/** The info-popover sentence for an imagery legend entry. */
export function imageryLegendInfo(meta: ImageryMeta): string {
  const { mosaicNoun, attribution } = providerDisplay(meta.provider);
  const scenes =
    meta.itemCount !== undefined
      ? ` built from ${meta.itemCount} scene${meta.itemCount === 1 ? "" : "s"}`
      : "";
  const closest = meta.targetDate
    ? ` closest to ${formatImageryDate(meta.targetDate)}`
    : "";
  const observed =
    meta.meanCloudCover !== undefined
      ? ` Mean observed cloud cover ${Math.round(meta.meanCloudCover)}%.`
      : "";
  return `${mosaicNoun}${scenes}${closest}.${observed} ${attribution}.`;
}

/**
 * A cautionary note shown when the search ran above the default cloud-cover
 * limit — partly obscured imagery is then expected and shouldn't read as a
 * rendering bug. Undefined when the default (or a stricter) limit applied.
 */
export function imageryCloudNote(meta: ImageryMeta): string | undefined {
  if (
    meta.maxCloudCover === undefined ||
    meta.maxCloudCover <= IMAGERY_DEFAULT_MAX_CLOUD_COVER
  ) {
    return undefined;
  }
  return `Searched with a loosened cloud-cover limit (${meta.maxCloudCover}%) — imagery may contain clouds.`;
}

/** Capture-row meta line, e.g. "cloud <50% · 9 scenes". */
export function captureMetaLabel(meta: ImageryMeta): string {
  const parts: string[] = [];
  if (meta.maxCloudCover !== undefined) {
    parts.push(`cloud <${meta.maxCloudCover}%`);
  }
  if (meta.itemCount !== undefined) {
    parts.push(`${meta.itemCount} scene${meta.itemCount === 1 ? "" : "s"}`);
  }
  return parts.join(" · ");
}

/**
 * Builds the single "Satellite Imagery" legend group from the imagery map
 * layers (one per show_imagery capture, newest first in the layer array).
 * Summary fields come from the newest (live) capture. Returns null when
 * there is nothing to show. Shared by the explorer legend hook and the
 * dashboard map-widget legend.
 */
export function buildImageryGroup(
  imageryLayers: Layer[],
  updating: boolean
): ImageryLegendGroup | null {
  if (imageryLayers.length === 0 && !updating) return null;

  const live = imageryLayers[0];
  const liveMeta = live?.imagery ? toImageryMeta(live.imagery) : undefined;
  const captures = imageryLayers.map((layer, index) => {
    const meta = toImageryMeta(layer.imagery!);
    return {
      layerId: layer.id,
      areaLabel: meta.aoiNames.join(", ") || layer.name,
      dateLabel: meta.targetDate ? formatCaptureDate(meta.targetDate) : "",
      metaLabel: captureMetaLabel(meta),
      visible: layer.visible,
      live: index === 0,
      thumbnailUrl: layer.tileUrl
        ? imageryThumbnailUrl(
            layer.tileUrl,
            layer.bounds,
            layer.minzoom,
            layer.maxzoom
          )
        : undefined,
    };
  });

  return {
    kind: "imagery",
    id: IMAGERY_LEGEND_GROUP_ID,
    title: IMAGERY_LAYER_NAME,
    subtitle: imagerySubtitle(liveMeta?.provider ?? "sentinel-2"),
    opacity: (live?.opacity ?? 1) * 100,
    params: liveMeta ? imageryLegendParams(liveMeta) : [],
    info: liveMeta ? imageryLegendInfo(liveMeta) : undefined,
    note: liveMeta ? imageryCloudNote(liveMeta) : undefined,
    captures,
    areaCount: new Set(captures.map((c) => c.areaLabel)).size,
    updating,
    thumbnailUrl: captures[0]?.thumbnailUrl,
  };
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
