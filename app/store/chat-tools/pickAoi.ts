import { FeatureCollection } from "geojson";
import { ChatMessage, StreamMessage, AOI } from "@/app/types/chat";
import useMapStore from "../mapStore";
import useContextStore from "../contextStore";
import { fetchGeometry } from "@/app/utils/geometryClient";

export async function pickAoiTool(
  streamMessage: StreamMessage,
  addMessage: (message: Omit<ChatMessage, "id">) => void
) {
  try {
    const { addGeoJsonFeature, flyToGeoJsonWithRetry } = useMapStore.getState();
    const { upsertContextByType } = useContextStore.getState();

    const aoiData = streamMessage.aoi as AOI;
    const aoiName = aoiData.name;

    // Check if geometry is already included, otherwise fetch it
    let geoJsonData: FeatureCollection;

    if (aoiData.geometry) {
      // Geometry already provided (backward compatibility)
      geoJsonData = aoiData.geometry;
    } else {
      // Fetch geometry using src_id and source
      if (!aoiData.src_id || !aoiData.source) {
        throw new Error("Missing src_id or source in AOI data");
      }

      const geometryResponse = await fetchGeometry(
        aoiData.source,
        aoiData.src_id
      );
      geoJsonData = geometryResponse.geometry;
    }

    addGeoJsonFeature({
      id: aoiName,
      name: aoiName,
      data: geoJsonData,
    });

    flyToGeoJsonWithRetry(geoJsonData);

    if (aoiName) {
      upsertContextByType({
        contextType: "area",
        content: aoiName,
      });
    }

    addMessage({
      type: "assistant",
      message: `Location found and displayed on map: ${
        aoiName || "Unknown location"
      }`,
      timestamp: streamMessage.timestamp,
    });
  } catch (error) {
    console.error("Error processing pick-aoi artifact:", error);

    addMessage({
      type: "assistant",
      message: `AOI tool executed but failed to display on map: ${
        streamMessage.content || "Unknown location"
      }. Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      timestamp: streamMessage.timestamp,
    });
  }
}
