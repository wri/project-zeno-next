import { DATASET_CARDS } from "@/app/constants/datasets";
import useMapStore from "@/app/store/mapStore";

import { getLayerContextFromDatasetCard } from "./datasetCardLayerContext";
import { buildDatasetLayers } from "./datasetLayerContext";

export const TCL_DATASET_ID = 4;
export const LGMS_NET_FLUX_DATASET_ID = 12;

/** The dataset a fresh map opens with (LGMS net flux under `ff=net-flux`). */
export function getDefaultDatasetId(isNetFlux: boolean): number {
  return isNetFlux ? LGMS_NET_FLUX_DATASET_ID : TCL_DATASET_ID;
}

/** Add the default dataset's layers unless the map already shows a dataset. */
export function seedDefaultDatasetLayer(datasetId: number): void {
  const { layers, addLayer } = useMapStore.getState();
  if (layers.some((l) => typeof l.datasetId === "number")) return;
  const card = DATASET_CARDS.find((c) => c.dataset_id === datasetId);
  if (!card) return;
  buildDatasetLayers(getLayerContextFromDatasetCard(card)).forEach(addLayer);
}
