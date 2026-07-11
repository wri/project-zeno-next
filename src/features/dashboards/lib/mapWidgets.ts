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
}

const str = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value : undefined;

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
    const activeName = str(d.context_layer);
    if (activeName && Array.isArray(d.context_layers)) {
      const entry = d.context_layers.find(
        (l): l is Record<string, unknown> =>
          !!l &&
          typeof l === "object" &&
          (l as { name?: unknown }).name === activeName
      );
      const entryUrl = str(entry?.tile_url);
      if (entryUrl) contextTileUrl = patchPrimaryForest(entryUrl);
    }

    return {
      kind: "dataset",
      title: titleOverride ?? str(d.dataset_name) ?? "Map layer",
      tileUrl: patchPrimaryForest(tileUrl),
      ...(contextTileUrl ? { contextTileUrl } : {}),
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
