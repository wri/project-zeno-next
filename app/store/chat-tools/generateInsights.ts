import {
  ChatMessage,
  StreamMessage,
  InsightWidget,
  AnalysisParams,
  DatasetInfo,
} from "@/app/types/chat";
import useMapStore from "../mapStore";
import { isAreaLayer } from "../layerManagerSlice";
import useInsightStore from "../insightStore";
import useChatStore from "../chatStore";

interface ChartData {
  id: string;
  title: string;
  type: "line" | "bar" | "table";
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
      // streamMessage carries the agent's authoritative selection for this
      // analysis. Prefer it over the map layers, which are updated
      // asynchronously by pickAoiTool/etc. and may not yet reflect this turn.
      const mapLayers = useMapStore.getState().layers;
      // The active dataset is the visible main dataset layer (skip context
      // sub-layers). Stream data still wins; this is the fallback source.
      const datasetLayer = mapLayers.find(
        (l) => typeof l.datasetId === "number" && !l.parentLayerId
      );
      // The active area is the first visible area layer (the query scope).
      const areaLayer = mapLayers.find((l) => l.visible && isAreaLayer(l));
      const selectionFromLayer =
        areaLayer?.aoiSelection?.name ?? areaLayer?.selectionName;
      const dataset = streamMessage.dataset as DatasetInfo | undefined;
      const analysisParams: AnalysisParams = {};

      const aoiFromStream = streamMessage.aoi_selection?.aois;
      const selectionFromStream = streamMessage.aoi_selection?.name;
      // Prefer the selection name (one chip) over the per-AOI list so the
      // chip matches the legend, which always shows one chip per selection.
      // Falls back to the AOI list / layer name when no name is given.
      if (selectionFromStream) {
        analysisParams.areas = [selectionFromStream];
      } else if (selectionFromLayer) {
        analysisParams.areas = [selectionFromLayer];
      } else if (aoiFromStream?.length) {
        analysisParams.areas = aoiFromStream.map((a) => a.name);
      } else if (areaLayer?.aoiSelection?.aois?.length) {
        analysisParams.areas = areaLayer.aoiSelection.aois.map((a) => a.name);
      } else if (areaLayer?.name) {
        analysisParams.areas = [areaLayer.name];
      }

      if (dataset?.dataset_name) {
        analysisParams.dataset = dataset.dataset_name;
      } else if (datasetLayer?.name) {
        analysisParams.dataset = datasetLayer.name;
      }

      if (typeof dataset?.threshold === "number") {
        analysisParams.canopyThreshold = dataset.threshold;
      } else if (typeof datasetLayer?.parameters?.canopy_cover === "number") {
        analysisParams.canopyThreshold = datasetLayer.parameters.canopy_cover;
      }

      const startStr = streamMessage.start_date ?? datasetLayer?.startDate;
      const endStr = streamMessage.end_date ?? datasetLayer?.endDate;
      if (startStr && endStr) {
        const startYear = new Date(startStr).getUTCFullYear();
        const endYear = new Date(endStr).getUTCFullYear();
        if (!Number.isNaN(startYear) && !Number.isNaN(endYear)) {
          analysisParams.startYear = startYear;
          analysisParams.endYear = endYear;
        }
      } else {
        const dateRange = useChatStore.getState().dateRange;
        if (dateRange) {
          analysisParams.startYear = dateRange.start.getFullYear();
          analysisParams.endYear = dateRange.end.getFullYear();
        }
      }

      const hasParams = Object.keys(analysisParams).length > 0;

      const datasetName = dataset?.dataset_name ?? analysisParams.dataset;

      const widgets: InsightWidget[] = (
        streamMessage.charts_data as ChartData[]
      ).map((chart: ChartData) => {
        const seriesFields = getSeriesFields(chart);
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
          generation: {
            codeact_parts: streamMessage.codeact_parts,
            source_urls: streamMessage.source_urls,
          },
          ...(hasParams ? { analysisParams } : {}),
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
