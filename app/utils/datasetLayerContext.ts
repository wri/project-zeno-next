import type { DatasetInfo } from "@/app/types/chat";
import { wrapPrimaryForestTileUrl } from "./primaryForestTileProtocol";

// Route primary forest tiles through the `pf://` protocol so the
// black-background PNGs render with alpha — see primaryForestTileProtocol.
function patchPrimaryForestTileUrl(url: string): string {
  if (!url.includes("umd_regional_primary_forest")) return url;
  return wrapPrimaryForestTileUrl(url);
}

export function getDatasetLayerContextProps(dataset: DatasetInfo) {
  // In the example of primary_forest, context_layer is "primary_forest" and context_layers is an array of context layers.
  // ctxMeta is the metadata for the context layer such as name, tile_url, description, legend, parameters, start_date, end_date.
  const ctxName = dataset.context_layer ?? null;
  const ctxMeta = ctxName
    ? dataset.context_layers?.find((c) => c.name === ctxName)
    : undefined;

  // parameters for example coverage percentage
  const parameters = dataset.parameters
    ? Object.fromEntries(
        dataset.parameters
          .filter((p) => Array.isArray(p.values) && p.values.length > 0)
          .map((p) => [p.name, p.values[0]])
      )
    : undefined;

  return {
    contextLayer: ctxMeta
      ? {
          name: ctxMeta.name,
          tileUrl: patchPrimaryForestTileUrl(ctxMeta.tile_url),
        }
      : undefined,
    parameters:
      parameters && Object.keys(parameters).length > 0 ? parameters : undefined,
    startDate: dataset.start_date,
    endDate: dataset.end_date,
  };
}
