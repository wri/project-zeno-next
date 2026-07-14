import { wrapPrimaryForestTileUrl } from "@/app/utils/primaryForestTileProtocol";

/**
 * A renderable map-widget layer parsed from a `widget_type: "map"` config
 * (dashboards-map-widgets-handoff.md). Configs are self-contained snapshots:
 * exactly one of `config.dataset` / `config.imagery`, each carrying a fully
 * resolved `tile_url` to render directly — no catalog lookup.
 */
export interface MapWidgetLayer {
  kind: "dataset" | "imagery";
  /** Card header: `config.title` override, else a kind-specific fallback. */
  title: string;
  tileUrl: string;
  /** The active context sub-layer's tiles, rendered beneath the main layer. */
  contextTileUrl?: string;
  /** The active context sub-layer's name — set only with `contextTileUrl`. */
  contextLayerName?: string;
  // Dataset-kind fields that drive the widget's legend (DashboardMapLegend).
  datasetId?: number;
  /** Display parameters as a record, e.g. `{ canopy_cover: 30 }`. */
  parameters?: Record<string, unknown>;
  startDate?: string;
  endDate?: string;
}

const str = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value : undefined;

// Config parameters are `[{ name, values }]` (per the handoff); the legend
// wants a `{ name: firstValue }` record — same reduction the explorer's
// getDatasetLayerContextProps applies to DatasetInfo.parameters.
function parametersRecord(
  parameters: unknown
): Record<string, unknown> | undefined {
  if (!Array.isArray(parameters)) return undefined;
  const entries = parameters
    .filter(
      (p): p is { name: string; values: unknown[] } =>
        !!p &&
        typeof p === "object" &&
        typeof (p as { name?: unknown }).name === "string" &&
        Array.isArray((p as { values?: unknown }).values) &&
        (p as { values: unknown[] }).values.length > 0
    )
    .map((p) => [p.name, p.values[0]] as const);
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

// Primary forest tiles ship black-background PNGs; the pf:// protocol
// rewrites black to alpha (same patch the explorer applies).
function patchPrimaryForest(url: string): string {
  return url.includes("umd_regional_primary_forest")
    ? wrapPrimaryForestTileUrl(url)
    : url;
}

/**
 * Parses a map widget's config into a renderable layer, or null when there is
 * nothing to render (no dataset/imagery sub-object, or no tile_url — the
 * caller shows a placeholder). The backend validates these on create, so null
 * here means a malformed or future config shape.
 */
export function mapWidgetLayer(
  config: Record<string, unknown>
): MapWidgetLayer | null {
  const titleOverride = str(config.title);

  const dataset = config.dataset;
  if (dataset && typeof dataset === "object") {
    const d = dataset as Record<string, unknown>;
    const tileUrl = str(d.tile_url);
    if (!tileUrl) return null;

    // Resolve the active context layer by name. Raster-only: vector (MVT)
    // context layers need a source_layer the persisted config doesn't carry.
    let contextTileUrl: string | undefined;
    let contextLayerName: string | undefined;
    const activeName = str(d.context_layer);
    if (activeName && Array.isArray(d.context_layers)) {
      const entry = d.context_layers.find(
        (l): l is Record<string, unknown> =>
          !!l &&
          typeof l === "object" &&
          (l as { name?: unknown }).name === activeName
      );
      const entryUrl = str(entry?.tile_url);
      if (entryUrl) {
        contextTileUrl = patchPrimaryForest(entryUrl);
        contextLayerName = activeName;
      }
    }

    const parameters = parametersRecord(d.parameters);
    const startDate = str(d.start_date);
    const endDate = str(d.end_date);

    return {
      kind: "dataset",
      title: titleOverride ?? str(d.dataset_name) ?? "Map layer",
      tileUrl: patchPrimaryForest(tileUrl),
      ...(contextTileUrl ? { contextTileUrl, contextLayerName } : {}),
      ...(typeof d.dataset_id === "number" ? { datasetId: d.dataset_id } : {}),
      ...(parameters ? { parameters } : {}),
      ...(startDate ? { startDate } : {}),
      ...(endDate ? { endDate } : {}),
    };
  }

  const imagery = config.imagery;
  if (imagery && typeof imagery === "object") {
    const im = imagery as Record<string, unknown>;
    const tileUrl = str(im.tile_url);
    if (!tileUrl) return null;
    const targetDate = str(im.target_date);
    return {
      kind: "imagery",
      title:
        titleOverride ??
        (targetDate
          ? `Sentinel-2 imagery, ${targetDate}`
          : "Sentinel-2 imagery"),
      tileUrl,
    };
  }

  return null;
}

/**
 * The reserved `config.viewport` manual override — the backend never writes
 * it, but per the handoff it wins over the AOI fit when present. Only a
 * `bbox: [west, south, east, north]` shape is honoured.
 */
export function mapWidgetViewportBbox(
  config: Record<string, unknown>
): [number, number, number, number] | null {
  const viewport = config.viewport;
  if (!viewport || typeof viewport !== "object") return null;
  const bbox = (viewport as { bbox?: unknown }).bbox;
  if (
    Array.isArray(bbox) &&
    bbox.length === 4 &&
    bbox.every((n) => typeof n === "number" && Number.isFinite(n))
  ) {
    return bbox as [number, number, number, number];
  }
  return null;
}
