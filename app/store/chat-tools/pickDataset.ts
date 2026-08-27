import {
  ChatMessage,
  StreamMessage,
  DatasetInfo,
  InsightWidget,
} from "@/app/types/chat";
import useMapStore from "../mapStore";
import {
  getDatasetLayerContextProps,
  buildDatasetLayers,
} from "@/app/utils/datasetLayerContext";

export function pickDatasetTool(
  streamMessage: StreamMessage,
  addMessage: (message: Omit<ChatMessage, "id">) => void
) {
  try {
    // Check if we have dataset information with a tile_url. A pick_dataset
    // turn that instead asks the user to choose carries a `nudge`, which is
    // buffered generically in processStreamMessage — not handled here.
    const dataset = streamMessage.dataset as DatasetInfo | undefined;

    if (dataset && (dataset.tile_url || dataset.layers?.length)) {
      // Create a dataset card widget for interactive tile layer adding
      const datasetWidget: InsightWidget = {
        type: "dataset-card",
        title: "Map Layer",
        description: `Click to add this layer to the map.`,
        data: dataset,
        xAxis: "",
        yAxis: "",
      };

      const layerContextProps = getDatasetLayerContextProps(dataset);

      // The visible layer IS the scope. Replace any existing dataset layers
      // and add this dataset's main + context sub-layers.
      const { addLayer, removeLayer, layers } = useMapStore.getState();
      layers
        .filter((l) => typeof l.datasetId === "number")
        .forEach((l) => removeLayer(l.id));
      buildDatasetLayers({
        datasetId: dataset.dataset_id,
        layerName: dataset.dataset_name,
        tileUrl: dataset.tile_url,
        layers: dataset.layers?.map((l) => ({
          name: l.name,
          tileUrl: l.tile_url,
        })),
        ...layerContextProps, // contextLayer / parameters / start+end dates
      }).forEach(addLayer);

      addMessage({
        type: "widget",
        message: "",
        widgets: [datasetWidget],
        timestamp: streamMessage.timestamp,
      });

      const trimmedReason = dataset.reason?.trim();
      if (trimmedReason) {
        addMessage({
          type: "assistant",
          message: trimmedReason,
          timestamp: streamMessage.timestamp,
        });
      }
    }
  } catch (error) {
    console.error("Error processing pick_dataset tool:", error);

    addMessage({
      type: "error",
      message: `Dataset tool executed but encountered an error: ${
        streamMessage.content || "Unknown error"
      }`,
      timestamp: streamMessage.timestamp,
    });
  }
}
