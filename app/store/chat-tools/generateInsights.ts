import { ChatMessage, StreamMessage, InsightWidget } from "@/app/types/chat";

interface ChartData {
  id: string;
  title: string;
  type: "line" | "bar" | "table";
  insight: string;
  data: unknown;
  xAxis: string;
  yAxis: string;
}

export function generateInsightsTool(
  streamMessage: StreamMessage,
  addMessage: (message: Omit<ChatMessage, "id">) => void
) {
  try {
    // Handle charts_data from streamMessage
    if (streamMessage.charts_data && Array.isArray(streamMessage.charts_data)) {
      const widgets: InsightWidget[] = (
        streamMessage.charts_data as ChartData[]
      ).map((chart: ChartData) => ({
        type: chart.type,
        title: chart.title,
        description: chart.insight,
        data: chart.data,
        xAxis: chart.xAxis,
        yAxis: chart.yAxis,
      }));

      console.log("FRONTEND: Received charts_data message:", widgets);

      addMessage({
        type: "widget",
        message: "Charts generated",
        widgets: widgets,
        timestamp: streamMessage.timestamp
      });
    }
  } catch (error) {
    console.error("Error processing generate_insights:", error);

    addMessage({
      type: "assistant",
      message: `Generate insights tool executed but failed to parse data: ${
        error instanceof Error ? error.message : JSON.stringify(error)
      }}`,
        timestamp: streamMessage.timestamp
    });
  }
}
