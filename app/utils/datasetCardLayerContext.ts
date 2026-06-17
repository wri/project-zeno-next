import type { ContextItem } from "@/app/store/contextStore";
import type { DatasetCardConfig } from "@/app/constants/datasets";

type LayerContextFromCard = Omit<
  ContextItem,
  "id" | "contextType" | "isAiContext"
>;

export function getLayerContextFromDatasetCard(
  card: DatasetCardConfig
): LayerContextFromCard {
  const startYear = card.defaultStartYear;
  const endYear = card.defaultEndYear;
  // Only scope the layer when both bounds are present, so a half-configured
  // card falls back to the unfiltered tile_url rather than a broken range.
  const hasYears = startYear != null && endYear != null;

  return {
    content: card.dataset_name,
    datasetId: card.dataset_id,
    tileUrl:
      hasYears && card.tile_url
        ? `${card.tile_url}&start_year=${startYear}&end_year=${endYear}`
        : card.tile_url,
    layerName: card.dataset_name,
    ...(hasYears
      ? {
          startDate: `${startYear}-01-01`,
          endDate: `${endYear}-12-31`,
        }
      : {}),
  };
}
