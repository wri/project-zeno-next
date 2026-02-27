import { ChatMessage, StreamMessage, InsightWidget } from "@/app/types/chat";
import useContextStore from "@/app/store/contextStore";
import useMapStore from "@/app/store/mapStore";
import useExplorePanelStore from "@/app/store/explorePanelStore";
import useChatStore from "@/app/store/chatStore";

interface ChartData {
  id: string;
  title: string;
  type: "line" | "bar" | "table";
  insight: string;
  data: unknown;
  xAxis: string;
  yAxis: string;
}

/**
 * Capture the current AOI from context + map stores so each insight widget
 * carries the location it was generated for (used for fly-to on activation).
 */
function captureCurrentAoi(): InsightWidget["aoi"] | undefined {
  const areaCtx = useContextStore
    .getState()
    .context.find((c) => c.contextType === "area");
  if (!areaCtx?.aoiData) return undefined;

  // Try to find matching geometry from map store
  const geoFeatures = useMapStore.getState().geoJsonFeatures;
  const match = geoFeatures.find(
    (f) => f.id === areaCtx.aoiData?.src_id || f.name === areaCtx.aoiData?.name
  );

  const geometry = match?.data
    ? match.data.type === "Feature"
      ? match.data
      : match.data.type === "FeatureCollection" && match.data.features[0]
        ? match.data.features[0]
        : undefined
    : undefined;

  return {
    name: areaCtx.aoiData.name,
    src_id: areaCtx.aoiData.src_id,
    gadm_id: areaCtx.aoiData.gadm_id,
    source: areaCtx.aoiData.source,
    subtype: areaCtx.aoiData.subtype,
    geometry: geometry as GeoJSON.Feature | undefined,
  };
}

export function generateInsightsTool(
  streamMessage: StreamMessage,
  addMessage: (message: Omit<ChatMessage, "id">) => void
) {
  try {
    // Handle charts_data from streamMessage
    if (streamMessage.charts_data && Array.isArray(streamMessage.charts_data)) {
      const aoi = captureCurrentAoi();

      const widgets: InsightWidget[] = (
        streamMessage.charts_data as ChartData[]
      ).map((chart: ChartData) => ({
        type: chart.type,
        title: chart.title,
        description: chart.insight,
        data: chart.data,
        xAxis: chart.xAxis,
        yAxis: chart.yAxis,
        generation: {
          codeact_parts: streamMessage.codeact_parts,
          source_urls: streamMessage.source_urls,
        },
        aoi,
      }));

      console.log("FRONTEND: Received charts_data message:", widgets);

      addMessage({
        type: "widget",
        message: "Charts generated",
        widgets: widgets,
        timestamp: streamMessage.timestamp,
      });

      // Automatically show the first insight on the map
      const lastMessage = useChatStore.getState().messages.at(-1);
      if (lastMessage && widgets.length > 0) {
        const widgetId = `widget-${lastMessage.id}-0`;
        useExplorePanelStore.getState().setActiveInsight(widgetId);
      }

      // Fly to the AOI on the map when insights are generated
      if (aoi?.geometry) {
        const { flyToGeoJsonWithRetry } = useMapStore.getState();
        flyToGeoJsonWithRetry(aoi.geometry);
      }
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
