import {
  ChatMessage,
  StreamMessage,
  DatasetInfo,
  InsightWidget,
} from "@/app/types/chat";
import useContextStore from "../contextStore";

export function pickDatasetTool(
  streamMessage: StreamMessage,
  addMessage: (message: Omit<ChatMessage, "id">) => void
) {
  const { upsertContextByType } = useContextStore.getState();
  try {
    // Check if we have dataset information with a tile_url
    const dataset = streamMessage.dataset as DatasetInfo | undefined;

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

      upsertContextByType({
        contextType: "layer",
        content: dataset.dataset_name,
        datasetId: dataset.dataset_id,
        tileUrl: dataset.tile_url,
        layerName: dataset.dataset_name,
        isAiContext: true,
      });

      addMessage({
        type: "widget",
        message: "",
        widgets: [datasetWidget],
        timestamp: streamMessage.timestamp,
      });
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
