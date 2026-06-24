import {
  ChatMessage,
  StreamMessage,
  DatasetInfo,
  InsightWidget,
  SuggestedDataset,
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
    // Check if we have dataset information with a tile_url
    const dataset = streamMessage.dataset as DatasetInfo | undefined;

    const suggestedDatasets = streamMessage.suggested_datasets as
      | SuggestedDataset[]
      | undefined;

    if (suggestedDatasets && suggestedDatasets.length > 0 && !dataset) {
      addMessage({
        type: "dataset-nudge",
        message: "",
        suggestedDatasets,
        timestamp: streamMessage.timestamp,
      });
      return;
    }

    if (dataset && dataset.tile_url) {
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
