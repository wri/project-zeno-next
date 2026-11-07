import { DatasetInfo, StreamMessage } from "@/app/types/chat";
import useMapStore from "../mapStore";
import { datasetMapLayers } from "@/app/utils/datasetLayerContext";

/**
 * pull_data returns the dataset only when it analysed another date range
 * than the dataset's layer shows (a follow-up turn asks for new dates without
 * a new pick_dataset). Move the dataset's layers on the map to that range in
 * place, so the tiles and the legend dates match the chart. A layer the user
 * removed stays removed, and visibility, opacity and order are kept.
 */
export function pullDataTool(streamMessage: StreamMessage) {
  const dataset = streamMessage.dataset as DatasetInfo | undefined;
  if (!dataset) return;

  const { updateLayer } = useMapStore.getState();
  datasetMapLayers(dataset).forEach(({ id, tileUrl, startDate, endDate }) =>
    updateLayer(id, { tileUrl, startDate, endDate })
  );
}
