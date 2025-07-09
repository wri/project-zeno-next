import { FeatureCollection } from "geojson";
import { ChatMessage, StreamMessage, AOI } from "@/app/types/chat";
import useMapStore from "../mapStore";
import useContextStore from "../contextStore";

export function pickAoiTool(
  streamMessage: StreamMessage,
  addMessage: (message: Omit<ChatMessage, "id" | "timestamp">) => void
) {
  try {
    const { addGeoJsonFeature, flyToGeoJsonWithRetry } = useMapStore.getState();
    const { addContext } = useContextStore.getState();

    const geoJsonData = (streamMessage.aoi as AOI)
      .geometry as FeatureCollection;

    const featureId = `location-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 11)}`;

    addGeoJsonFeature({
      id: featureId,
      name: streamMessage.content || "Location",
      data: geoJsonData,
    });

    flyToGeoJsonWithRetry(geoJsonData);
    console.log(streamMessage);
    const aoiName = (streamMessage.aoi as AOI).name as string;
    console.log(streamMessage.aoi);

    if (aoiName) {
      addContext({
        contextType: "area",
        content: aoiName,
      });
    }

    addMessage({
      type: "assistant",
      message: `Location found and displayed on map: ${
        aoiName || "Unknown location"
      }`,
    });
  } catch (error) {
    console.error("Error processing pick-aoi artifact:", error);

    addMessage({
      type: "assistant",
      message: `AOI tool executed but failed to display on map: ${
        streamMessage.content || "Unknown location"
      }`,
    });
  }
}
