import {
  ChatMessage,
  StreamMessage,
  InsightWidget,
  AnalysisParams,
  DatasetInfo,
} from "@/app/types/chat";
import useContextStore from "../contextStore";
import useInsightStore from "../insightStore";

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
    if (streamMessage.charts_data && Array.isArray(streamMessage.charts_data)) {
      // streamMessage carries the agent's authoritative selection for this
      // analysis. Prefer it over contextStore, which is updated asynchronously
      // by pickAoiTool/etc. and may not yet reflect this turn's choices.
      const context = useContextStore.getState().context;
      const dataset = streamMessage.dataset as DatasetInfo | undefined;
      const analysisParams: AnalysisParams = {};

      const aoiFromStream = streamMessage.aoi_selection?.aois;
      const areaItem = context.find((c) => c.contextType === "area");
      if (aoiFromStream?.length) {
        analysisParams.areas = aoiFromStream.map((a) => a.name);
      } else if (areaItem?.aoiSelection?.aois?.length) {
        analysisParams.areas = areaItem.aoiSelection.aois.map((a) => a.name);
      } else if (typeof areaItem?.content === "string" && areaItem.content) {
        analysisParams.areas = [areaItem.content];
      }

      const layerItem = context.find((c) => c.contextType === "layer");
      if (dataset?.dataset_name) {
        analysisParams.dataset = dataset.dataset_name;
      } else if (layerItem?.layerName) {
        analysisParams.dataset = layerItem.layerName;
      }

      if (typeof dataset?.threshold === "number") {
        analysisParams.canopyThreshold = dataset.threshold;
      } else if (typeof layerItem?.parameters?.canopy_cover === "number") {
        analysisParams.canopyThreshold = layerItem.parameters.canopy_cover;
      }

      const startStr = streamMessage.start_date ?? layerItem?.startDate;
      const endStr = streamMessage.end_date ?? layerItem?.endDate;
      if (startStr && endStr) {
        const startYear = new Date(startStr).getUTCFullYear();
        const endYear = new Date(endStr).getUTCFullYear();
        if (!Number.isNaN(startYear) && !Number.isNaN(endYear)) {
          analysisParams.startYear = startYear;
          analysisParams.endYear = endYear;
        }
      } else {
        const dateItem = context.find((c) => c.contextType === "date");
        if (dateItem?.dateRange) {
          analysisParams.startYear = dateItem.dateRange.start.getFullYear();
          analysisParams.endYear = dateItem.dateRange.end.getFullYear();
        }
      }

      const hasParams = Object.keys(analysisParams).length > 0;

      const datasetName = dataset?.dataset_name ?? analysisParams.dataset;

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

      useInsightStore.getState().addInsights(widgets);

      addMessage({
        type: "assistant",
        message: "I've created an insight you can view on the map.",
        timestamp: streamMessage.timestamp,
        widgets,
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
