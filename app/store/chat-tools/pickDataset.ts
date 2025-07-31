import {
  ChatMessage,
  StreamMessage,
  DatasetInfo,
  InsightWidget,
} from "@/app/types/chat";

export function pickDatasetTool(
  streamMessage: StreamMessage,
  addMessage: (message: Omit<ChatMessage, "id" | "timestamp">) => void
) {
  try {
    // Check if we have dataset information with a tile_url
    const dataset = streamMessage.dataset as DatasetInfo | undefined;

    if (dataset && dataset.tile_url) {
      // Create a dataset card widget for interactive tile layer adding
      const datasetWidget: InsightWidget = {
        type: "dataset-card",
        title: `${dataset.source} - ${dataset.data_layer}`,
        description: `Dataset from ${dataset.source}. Click to add this layer to the map.`,
        data: dataset,
        xAxis: "",
        yAxis: "",
      };

      addMessage({
        type: "widget",
        message: "",
        widgets: [datasetWidget],
      });
    } else {
      // Fallback for datasets without tile_url
      addMessage({
        type: "assistant",
        message: `Dataset found: ${streamMessage.content || "Unknown dataset"}`,
      });
    }
  } catch (error) {
    console.error("Error processing pick-dataset tool:", error);

    addMessage({
      type: "assistant",
      message: `Dataset tool executed but encountered an error: ${
        streamMessage.content || "Unknown error"
      }`,
    });
  }
}
