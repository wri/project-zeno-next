import type { DatasetCardConfig } from "@/app/constants/datasets";
import type { Layer } from "@/app/store/layerManagerSlice";
import {
  buildDatasetLayers,
  type DatasetLayerSpec,
} from "./datasetLayerContext";

function withYearParam(
  url: string,
  hasYears: boolean,
  startYear: number | undefined,
  endYear: number | undefined
): string {
  return hasYears ? `${url}&start_year=${startYear}&end_year=${endYear}` : url;
}

export function getLayerContextFromDatasetCard(
  card: DatasetCardConfig
): DatasetLayerSpec {
  const startYear = card.defaultStartYear;
  const endYear = card.defaultEndYear;
  // Only scope the layer(s) when both bounds are present, so a
  // half-configured card falls back to the unfiltered tile_url rather than a
  // broken range.
  const hasYears = startYear != null && endYear != null;

  return {
    datasetId: card.dataset_id,
    layerName: card.dataset_name,
    tileUrl:
      card.tile_url &&
      withYearParam(card.tile_url, hasYears, startYear, endYear),
    layers: card.layers?.map((l) => ({
      name: l.name,
      tileUrl: withYearParam(l.tile_url, hasYears, startYear, endYear),
    })),
    ...(hasYears
      ? {
          startDate: `${startYear}-01-01`,
          endDate: `${endYear}-12-31`,
        }
      : {}),
  };
}

/** Build the managed map layers for a dataset card — one per declared layer,
 * plus an optional context sub-layer. */
export function datasetCardLayers(card: DatasetCardConfig): Layer[] {
  const context = getLayerContextFromDatasetCard(card);
  if (!context.tileUrl) {
    // Analytics-only dataset (e.g. LGMS): no raster to render, but the layer
    // manager is still the source of truth for "is this dataset active" (see
    // showViewAnalysisNudge). DynamicTileLayers already skips raster layers
    // with no tileUrl, so this stays safely invisible on the map.
    return [
      {
        id: `dataset-${card.dataset_id}`,
        name: card.dataset_name,
        type: "raster",
        visible: true,
        datasetId: card.dataset_id,
      },
    ];
  }
  return buildDatasetLayers(context);
}
