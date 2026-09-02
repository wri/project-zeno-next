import type { Nudge, SuggestedDataset } from "@/app/types/chat";
import useMapStore from "@/app/store/mapStore";
import { DATASET_BY_ID } from "@/app/constants/datasets";
import {
  getDatasetLayerContextProps,
  buildDatasetLayers,
  toLayerEntries,
} from "@/app/utils/datasetLayerContext";

/**
 * Validates a dataset_choice nudge `data` entry. The backend contract says
 * `data` aligns with `options`, but alignment is never assumed: a missing,
 * short or malformed entry makes the option render as a plain button instead.
 */
export function isSuggestedDataset(
  entry: unknown
): entry is SuggestedDataset & Record<string, unknown> {
  return (
    typeof entry === "object" &&
    entry !== null &&
    typeof (entry as SuggestedDataset).dataset_id === "number" &&
    typeof (entry as SuggestedDataset).dataset_name === "string"
  );
}

/**
 * Returns the dataset payload backing the option at `index` of a
 * dataset_choice nudge, or null when there is none (non-dataset nudge,
 * absent/short `data`, malformed entry).
 */
export function datasetChoiceEntry(
  nudge: Nudge,
  index: number
): SuggestedDataset | null {
  if (nudge.type !== "dataset_choice") return null;
  const entry = nudge.data?.[index];
  return isSuggestedDataset(entry) ? entry : null;
}

/**
 * Index of the option to highlight as recommended. The backend ranks options
 * (index 0 is the recommendation), but legacy dataset_choice nudges
 * synthesized from pre-migration suggested_datasets can flag any entry as
 * `recommended: true` — honor that on replay, then fall back to rank.
 */
export function recommendedOptionIndex(nudge: Nudge): number {
  const flagged =
    nudge.data?.findIndex((entry) => entry?.recommended === true) ?? -1;
  return flagged >= 0 ? flagged : 0;
}

/**
 * Optimistically adds a picked suggested dataset to the map, ahead of the
 * agent's confirmation turn: looks up the local dataset metadata, merges the
 * nudge entry's overrides (context layer, dates, parameters), replaces any
 * existing dataset layers and adds this dataset's layer(s).
 *
 * No-ops when the dataset id is unknown locally — the agent's own
 * pick_dataset result will add the layer authoritatively.
 */
export function addSuggestedDatasetToMap(selected: SuggestedDataset): void {
  const datasetMetadata = DATASET_BY_ID[selected.dataset_id];
  if (!datasetMetadata) return;

  const merged = {
    ...datasetMetadata,
    ...(selected.context_layer !== undefined && {
      context_layer: selected.context_layer,
    }),
    ...(selected.start_date && { start_date: selected.start_date }),
    ...(selected.end_date && { end_date: selected.end_date }),
    ...(selected.parameters && { parameters: selected.parameters }),
  };

  const layerContextProps = getDatasetLayerContextProps(merged);
  // The visible layer IS the scope. Replace any existing dataset layers
  // (single-dataset selection) and add this dataset's layers to the map.
  const { addLayer, removeLayer, layers } = useMapStore.getState();
  layers
    .filter((l) => typeof l.datasetId === "number")
    .forEach((l) => removeLayer(l.id));
  buildDatasetLayers({
    datasetId: merged.dataset_id,
    layerName: merged.dataset_name,
    tileUrl: merged.tile_url,
    layers: toLayerEntries(merged.layers),
    ...layerContextProps,
  }).forEach(addLayer);
}
