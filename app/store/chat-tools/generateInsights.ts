import JSON5 from "json5";
import {
  ChatMessage,
  StreamMessage,
  InsightWidget,
  RawInsightData,
} from "@/app/types/chat";

export function generateInsightsTool(
  streamMessage: StreamMessage,
  addMessage: (message: Omit<ChatMessage, "id" | "timestamp">) => void
) {
  try {
    const artifactData =
      typeof streamMessage.content === "string"
        ? JSON5.parse(streamMessage.content)
        : streamMessage.content;

    // Handle generic insights (previously kba-insights-tool)
    if (artifactData.insights && Array.isArray(artifactData.insights)) {
      const widgets: InsightWidget[] = artifactData.insights.map(
        (insight: RawInsightData) => ({
          type: insight.type as InsightWidget["type"],
          title: insight.title,
          description: insight.description,
          data: insight.data,
        })
      );

      addMessage({
        type: "widget",
        message: "Insights generated",
        widgets: widgets,
      });
    }
    // Handle timeseries insights (previously kba-timeseries-tool)
    else if (artifactData.type === "timeseries") {
      const widget: InsightWidget = {
        type: "timeseries",
        title: artifactData.title || "Time Series Analysis",
        description: artifactData.description || "Time series data analysis",
        data: artifactData,
      };
      addMessage({
        type: "widget",
        message: artifactData.title || "Time Series Analysis",
        widgets: [widget],
      });
    } else {
      console.error(
        "Unknown insight format for generate-insights tool:",
        artifactData
      );

      addMessage({
        type: "assistant",
        message: `Insights generated, but format not recognized.`,
      });
    }
  } catch (error) {
    console.error("Error processing generate-insights artifact:", error);

    addMessage({
      type: "assistant",
      message: `Generate insights tool executed but failed to parse data: ${
        streamMessage.content || "Unknown insights"
      }`,
    });
  }
}
