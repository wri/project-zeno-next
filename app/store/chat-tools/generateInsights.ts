import { ChatMessage, StreamMessage, InsightWidget } from "@/app/types/chat";
import useInsightStore from "../insightStore";
import type { ChartColorFields } from "@/app/types/chartColors";
import { pickChartColors } from "@/app/utils/pickChartColors";
import {
  codeActParts,
  isCuratedInsight,
  soleDataset,
  toAnalysisInputs,
} from "@/src/entities/insight";

interface ChartData extends ChartColorFields {
  id: string;
  title: string;
  type: InsightWidget["type"];
  insight: string;
  data: unknown;
  xAxis: string;
  yAxis: string;
  seriesFields?: string[];
  series_fields?: string[];
}

function getSeriesFields(chart: ChartData): string[] | undefined {
  const fields = chart.seriesFields ?? chart.series_fields;
  return Array.isArray(fields) && fields.length > 0 ? fields : undefined;
}

export function generateInsightsTool(
  streamMessage: StreamMessage,
  addMessage: (message: Omit<ChatMessage, "id">) => void
) {
  try {
    if (streamMessage.charts_data && Array.isArray(streamMessage.charts_data)) {
      // Only what the backend recorded, never the map or the chat's date
      // range: those show what is on screen now, not what was analysed.
      const analysisInputs = toAnalysisInputs(
        streamMessage.analysis_inputs,
        streamMessage.insight_id
      );
      const datasetName = soleDataset(analysisInputs)?.name;

      const widgets: InsightWidget[] = (
        streamMessage.charts_data as ChartData[]
      ).map((chart: ChartData, position) => {
        const seriesFields = getSeriesFields(chart);
        const curated = isCuratedInsight(streamMessage.codeact_parts);
        const parts = codeActParts(streamMessage.codeact_parts);
        return {
          id: chart.id,
          type: chart.type,
          title: chart.title,
          description: chart.insight,
          data: chart.data,
          xAxis: chart.xAxis,
          yAxis: chart.yAxis,
          ...(seriesFields ? { seriesFields } : {}),
          ...(datasetName ? { datasetName } : {}),
          ...pickChartColors(chart),
          curated,
          ...(parts.length > 0
            ? {
                generation: {
                  codeact_parts: parts,
                  source_urls: streamMessage.source_urls,
                },
              }
            : {}),
          analysisInputs,
          // Shared by all charts of the analysis — the handle for the
          // "Add to dashboard" toggle (REST widget add, no chat round trip).
          ...(streamMessage.insight_id
            ? { insightId: streamMessage.insight_id }
            : {}),
          // The backend streams charts_data in position order.
          chartPosition: position,
        };
      });

      useInsightStore.getState().addInsights(widgets);
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
