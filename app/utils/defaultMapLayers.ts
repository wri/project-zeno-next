import {
  DATASET_CARDS,
  TREE_COVER_LOSS_DATASET_ID,
} from "@/app/constants/datasets";
import useMapStore from "@/app/store/mapStore";

import { getLayerContextFromDatasetCard } from "./datasetCardLayerContext";
import { buildDatasetLayers } from "./datasetLayerContext";

export const LGMS_NET_FLUX_DATASET_ID = 12;

/**
 * The dataset a fresh map opens with (LGMS net flux under `ff=net-flux`).
 * NOTE: the net-flux branch is super custom code for ff=net-flux. Remove asap.
 */
export function getDefaultDatasetId(isNetFlux: boolean): number {
  return isNetFlux ? LGMS_NET_FLUX_DATASET_ID : TREE_COVER_LOSS_DATASET_ID;
}

/** Add the default dataset's layers unless the map already shows a dataset. */
export function seedDefaultDatasetLayer(datasetId: number): void {
  const { layers, addLayer } = useMapStore.getState();
  if (layers.some((l) => typeof l.datasetId === "number")) return;
  const card = DATASET_CARDS.find((c) => c.dataset_id === datasetId);
  if (!card) return;
  buildDatasetLayers(getLayerContextFromDatasetCard(card)).forEach(addLayer);
}
