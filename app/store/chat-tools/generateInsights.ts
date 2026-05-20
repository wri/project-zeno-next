import {
  ChatMessage,
  StreamMessage,
  InsightWidget,
  AnalysisParams,
} from "@/app/types/chat";
import useContextStore from "../contextStore";

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
      // Build analysis params from contextStore — the earlier tools (pick_aoi,
      // pick_dataset, pull_data) populate the store before generate_insights fires.
      const context = useContextStore.getState().context;

      const analysisParams: AnalysisParams = {};

      // Areas from "area" context
      const areaItem = context.find((c) => c.contextType === "area");
      if (areaItem?.aoiSelection?.aois?.length) {
        analysisParams.areas = areaItem.aoiSelection.aois.map((a) => a.name);
      } else if (typeof areaItem?.content === "string" && areaItem.content) {
        analysisParams.areas = [areaItem.content];
      }

      // Dataset name and canopy threshold from "layer" context
      const layerItem = context.find((c) => c.contextType === "layer");
      if (layerItem?.layerName) {
        analysisParams.dataset = layerItem.layerName;
      }
      if (typeof layerItem?.parameters?.canopy_cover === "number") {
        analysisParams.canopyThreshold = layerItem.parameters.canopy_cover;
      }

      // Year range from "date" context
      const dateItem = context.find((c) => c.contextType === "date");
      if (dateItem?.dateRange) {
        analysisParams.startYear = dateItem.dateRange.start.getFullYear();
        analysisParams.endYear = dateItem.dateRange.end.getFullYear();
      }

      const hasParams = Object.keys(analysisParams).length > 0;

      // Dataset name for legacy datasetName field (used elsewhere)
      const datasetName =
        (streamMessage.dataset as { dataset_name?: string } | undefined)
          ?.dataset_name ?? analysisParams.dataset;

      const widgets: InsightWidget[] = (
        streamMessage.charts_data as ChartData[]
      ).map((chart: ChartData) => ({
        type: chart.type,
        title: chart.title,
        description: chart.insight,
        data: chart.data,
        xAxis: chart.xAxis,
        yAxis: chart.yAxis,
        ...(datasetName ? { datasetName } : {}),
        generation: {
          codeact_parts: streamMessage.codeact_parts,
          source_urls: streamMessage.source_urls,
        },
        ...(hasParams ? { analysisParams } : {}),
      }));

      console.log("FRONTEND: Received charts_data message:", widgets);

      addMessage({
        type: "widget",
        message: "Charts generated",
        widgets: widgets,
        timestamp: streamMessage.timestamp,
      });
    }
  } catch (error) {
    console.error("Error processing generate_insights:", error);

    addMessage({
      type: "error",
      message: `Generate insights tool executed but failed to parse data: ${
        error instanceof Error ? error.message : JSON.stringify(error)
      }}`,
      timestamp: streamMessage.timestamp,
    });
  }
}
