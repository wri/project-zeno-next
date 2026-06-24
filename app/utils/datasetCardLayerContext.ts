import type { DatasetCardConfig } from "@/app/constants/datasets";
import type { DatasetLayerSpec } from "./datasetLayerContext";

export function getLayerContextFromDatasetCard(
  card: DatasetCardConfig
): DatasetLayerSpec {
  const startYear = card.defaultStartYear;
  const endYear = card.defaultEndYear;
  // Only scope the layer when both bounds are present, so a half-configured
  // card falls back to the unfiltered tile_url rather than a broken range.
  const hasYears = startYear != null && endYear != null;

  return {
    datasetId: card.dataset_id,
    layerName: card.dataset_name,
    tileUrl:
      hasYears && card.tile_url
        ? `${card.tile_url}&start_year=${startYear}&end_year=${endYear}`
        : card.tile_url,
    ...(hasYears
      ? {
          startDate: `${startYear}-01-01`,
          endDate: `${endYear}-12-31`,
        }
      : {}),
  };
}
