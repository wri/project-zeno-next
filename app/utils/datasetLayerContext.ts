import type { DatasetInfo } from "@/app/types/chat";
import {
  DATASET_CARDS,
  CONTEXT_LAYER_METADATA,
} from "@/app/constants/datasets";
import type { Layer } from "@/app/store/layerManagerSlice";
import { wrapPrimaryForestTileUrl } from "./primaryForestTileProtocol";

// One of a dataset's primary, independently-toggleable data layers (see
// DatasetLayer in app/types/chat.ts).
export interface DatasetLayerEntry {
  name: string;
  tileUrl: string;
  // Falls back to the spec's dataset-level startDate/endDate when a layer
  // doesn't declare its own (true for every dataset today, including LGMS's
  // two placeholder layers — see the TODO in datasets.ts).
  startDate?: string;
  endDate?: string;
}

// Maps a backend/catalog layer's wire shape ({name, tile_url, start_date?,
// end_date?}) to DatasetLayerEntry. The one place this conversion lives, so
// pickDatasetTool, nudgeDataset and the static DATASET_CARDS catalog can't
// drift out of sync with each other or with buildDatasetLayers.
export function toLayerEntries(
  layers:
    | {
        name: string;
        tile_url: string;
        start_date?: string;
        end_date?: string;
      }[]
    | undefined
): DatasetLayerEntry[] | undefined {
  return layers?.map((l) => ({
    name: l.name,
    tileUrl: l.tile_url,
    startDate: l.start_date,
    endDate: l.end_date,
  }));
}

// The map layer id for one of a dataset's declared layers. The primary
// (index 0) layer keeps the plain `dataset-${id}` id — legend/removeDatasetLayers/
// exportToAI key off `datasetId`, not this string, but call sites that also
// need the concrete id (e.g. CatalogPanel) must derive it the same way
// buildDatasetLayers does, so this is the one place that formula lives.
export function datasetLayerId(
  datasetId: number,
  index: number,
  name: string
): string {
  return index === 0 ? `dataset-${datasetId}` : `dataset-${datasetId}-${name}`;
}

// Minimal description of a dataset's map presence. Produced by the dataset-card
// / pick_dataset helpers and consumed by buildDatasetLayers, which adds the
// dataset's layer(s) to the map.
export interface DatasetLayerSpec {
  datasetId: number;
  // The dataset's primary layer(s), most datasets have exactly one, LGMS has
  // two (agriculture, lulucf). Always used over `layerName`/`tileUrl` when
  // non-empty.
  layers?: DatasetLayerEntry[];
  layerName?: string;
  tileUrl?: string;
  parameters?: Record<string, unknown>;
  startDate?: string;
  endDate?: string;
  contextLayer?: { name: string; tileUrl: string; sourceLayer?: string };
}

/**
 * Builds the managed map layers for a dataset: one raster layer per entry in
 * `spec.layers` (or, when absent, a single layer from `spec.layerName`/
 * `spec.tileUrl`), plus an optional context sub-layer (e.g. Primary Forests
 * beneath Tree Cover Loss) attached beneath the first/primary layer.
 *
 * Layers are returned primary-first so callers can `forEach(addLayer)`:
 * addLayer appends, so the primary layer keeps index 0 and DynamicTileLayers
 * renders it on top of its context sub-layer and any sibling layers. Returns
 * [] when there is no layer to render.
 */
export function buildDatasetLayers(spec: DatasetLayerSpec): Layer[] {
  // The `spec.tileUrl` branch is dead for the live pick_dataset path — the
  // backend's DatasetSelectionResult.layers is always populated (auto-derived
  // from tile_url server-side when the yml has no explicit `layers`; see
  // get_dataset_layers in pick_dataset/tool.py). It stays load-bearing here
  // because this function is also called from the static DATASET_CARDS
  // catalog-browse path (datasetCardLayers), where only LGMS has been
  // migrated to declare `layers` — every other card still only sets
  // `tile_url`.
  const entries: DatasetLayerEntry[] =
    spec.layers && spec.layers.length > 0
      ? spec.layers
      : spec.tileUrl
        ? [
            {
              name: spec.layerName || String(spec.datasetId),
              tileUrl: spec.tileUrl,
            },
          ]
        : [];
  if (entries.length === 0) return [];

  const primaryLayerId = datasetLayerId(spec.datasetId, 0, entries[0].name);
  const layers: Layer[] = entries.map((entry, index) => ({
    id: datasetLayerId(spec.datasetId, index, entry.name),
    name: entry.name,
    type: "raster",
    visible: true,
    tileUrl: entry.tileUrl,
    datasetId: spec.datasetId,
    parameters: spec.parameters,
    startDate: entry.startDate ?? spec.startDate,
    endDate: entry.endDate ?? spec.endDate,
  }));

  if (spec.contextLayer) {
    const ctx = spec.contextLayer;
    const isVector = !!ctx.sourceLayer;
    layers.push({
      id: `dataset-${spec.datasetId}-ctx-${ctx.name}`,
      name: ctx.name,
      type: isVector ? "vector" : "raster",
      visible: true,
      tileUrl: ctx.tileUrl,
      sourceLayer: ctx.sourceLayer,
      vectorStyle: isVector
        ? CONTEXT_LAYER_METADATA[ctx.name]?.vectorStyle
        : undefined,
      datasetId: spec.datasetId,
      parentLayerId: primaryLayerId,
    });
  }

  return layers;
}

// Route primary forest tiles through the `pf://` protocol so the
// black-background PNGs render with alpha — see primaryForestTileProtocol.
function patchPrimaryForestTileUrl(url: string): string {
  if (!url.includes("umd_regional_primary_forest")) return url;
  return wrapPrimaryForestTileUrl(url);
}

/**
 * Derives the map layer props needed to add a dataset to the map and legend.
 *
 * Returns three things:
 *  - `contextLayer` — optional sub-layer rendered beneath the main dataset
 *    (e.g. Primary Forests mask under Tree Cover Loss). Resolved from
 *    `dataset.context_layer` + `dataset.context_layers[]`.
 *  - `parameters` — key/value record of display parameters shown as legend
 *    chips (e.g. `{ canopy_cover: 30 }`). Backend-supplied values take
 *    priority; falls back to `dataset.threshold` then the card default in
 *    `DATASET_CARDS`. Will be `undefined` if the dataset has no threshold.
 *  - `startDate` / `endDate` — ISO date strings forwarded from the backend,
 *    shown as the YEAR/YEARS chip in the legend.
 */
export function getDatasetLayerContextProps(dataset: DatasetInfo) {
  // In the example of primary_forest, context_layer is "primary_forest" and context_layers is an array of context layers.
  // ctxMeta is the metadata for the context layer such as name, tile_url, description, legend, parameters, start_date, end_date.
  const ctxName = dataset.context_layer ?? null;
  const ctxMeta = ctxName
    ? dataset.context_layers?.find((c) => c.name === ctxName)
    : undefined;

  // Parameters from the backend are authoritative; otherwise use the dataset's
  // default canopy threshold so the legend can still describe the rendered tile.
  const explicitParameters = Object.fromEntries(
    (dataset.parameters ?? [])
      .filter((p) => Array.isArray(p.values) && p.values.length > 0)
      .map((p) => [p.name, p.values[0]])
  );
  const datasetDefaults = DATASET_CARDS.find(
    (d) =>
      d.dataset_id === dataset.dataset_id ||
      d.dataset_name === dataset.dataset_name
  );
  const defaultCanopyCover = dataset.threshold ?? datasetDefaults?.threshold;
  const parameters =
    Object.keys(explicitParameters).length > 0
      ? explicitParameters
      : typeof defaultCanopyCover === "number"
        ? { canopy_cover: defaultCanopyCover }
        : undefined;

  const isVector =
    ctxMeta?.type === "vector" ||
    (!!ctxMeta?.source_layer && ctxMeta.source_layer.length > 0);

  return {
    contextLayer: ctxMeta?.tile_url
      ? {
          name: ctxMeta.name,
          // TODO: the pf:// protocol wrapper is a client-side hack to composite
          // alpha on Primary Forest PNGs whose source tiles have a black
          // background. This should either be generalised into a declarative
          // per-layer flag (e.g. `requiresAlphaComposite: true` on
          // ContextLayerMetadata) or eliminated by serving pre-composited tiles
          // from the backend. Until then, only raster URLs go through this patch.
          tileUrl: isVector
            ? ctxMeta.tile_url
            : patchPrimaryForestTileUrl(ctxMeta.tile_url),
          sourceLayer: isVector
            ? (ctxMeta.source_layer ?? undefined)
            : undefined,
        }
      : undefined,
    parameters,
    startDate: dataset.start_date,
    endDate: dataset.end_date,
  };
}
