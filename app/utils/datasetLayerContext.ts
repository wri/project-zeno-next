import type { DatasetInfo } from "@/app/types/chat";
import { DATASET_CARDS } from "@/app/constants/datasets";
import { wrapPrimaryForestTileUrl } from "./primaryForestTileProtocol";

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
