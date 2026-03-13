import { Feature, FeatureCollection } from "geojson";
import { ChatMessage, StreamMessage, AOI, AOISelection } from "@/app/types/chat";
import useMapStore from "../mapStore";
import useContextStore from "../contextStore";
import { fetchGeometry } from "@/app/utils/geometryClient";
import bbox from "@turf/bbox";

/**
 * Fetch geometry for a single AOI and add it to the map.
 * Returns the raw geometry data (FeatureCollection or Feature) for combined
 * bounds computation.
 * @param selectionName - The name of the selection of AOIs. Used in multi-area selection.
 */
async function fetchAndDisplayAoi(
  aoi: AOI,
  addGeoJsonFeature: (feature: { id: string; name: string; selectionName?: string; data: FeatureCollection | Feature }) => void,
  selectionName?: string
): Promise<FeatureCollection | Feature> {
  let geoJsonData: FeatureCollection;

  if (aoi.geometry) {
    geoJsonData = aoi.geometry;
  } else {
    if (!aoi.src_id || !aoi.source) {
      throw new Error(`Missing src_id or source in AOI data for "${aoi.name}"`);
    }
    const geometryResponse = await fetchGeometry(aoi.source, aoi.src_id);
    geoJsonData = geometryResponse.geometry;
  }

  addGeoJsonFeature({
    id: aoi.name,
    name: aoi.name,
    selectionName: selectionName,
    data: geoJsonData,
  });

  return geoJsonData;
}

export async function pickAoiTool(
  streamMessage: StreamMessage,
  addMessage: (message: Omit<ChatMessage, "id">) => void
) {
  try {
    const { addGeoJsonFeature, flyToGeoJsonWithRetry, setAoiSelection } = useMapStore.getState();
    const { upsertContextByType } = useContextStore.getState();

    // Prefer the new multi-AOI aoi_selection, fall back to single aoi
    const aoiSelection: AOISelection | undefined = streamMessage.aoi_selection;
    const aois: AOI[] = aoiSelection?.aois ?? (streamMessage.aoi ? [streamMessage.aoi as AOI] : []);
    const selectionName: string = aoiSelection?.name ?? (aois[0]?.name || "Unknown");

    if (aois.length === 0) {
      throw new Error("No AOI data found in stream message");
    }

    // Build an AOISelection to store on the context (even for single-AOI fallback)
    const selectionForContext: AOISelection = aoiSelection ?? {
      name: selectionName,
      aois,
    };

    // Fetch geometry for all AOIs in parallel
    // If there are multiple AOIs, forward the selection name to the addGeoJsonFeature function.
    const results = await Promise.allSettled(
      aois.map((aoi) => fetchAndDisplayAoi(aoi, addGeoJsonFeature, aois.length > 1 ? selectionName : undefined))
    );

    // Collect all raw geometry data for combined bounds, track failures
    const allGeoData: (FeatureCollection | Feature)[] = [];
    const failures: string[] = [];

    results.forEach((result, idx) => {
      if (result.status === "fulfilled") {
        allGeoData.push(result.value);
      } else {
        const aoiName = aois[idx]?.name ?? `AOI ${idx}`;
        console.error(`Failed to fetch geometry for "${aoiName}":`, result.reason);
        failures.push(aoiName);
      }
    });

    // Compute a single combined bounding box across all geometries and fly to it
    if (allGeoData.length > 0) {
      // Compute individual bboxes and merge into one encompassing bbox
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const geoData of allGeoData) {
        const b = bbox(geoData);
        if (b[0] < minX) minX = b[0];
        if (b[1] < minY) minY = b[1];
        if (b[2] > maxX) maxX = b[2];
        if (b[3] > maxY) maxY = b[3];
      }

      // Create a simple bbox polygon feature to fly to
      const bboxFeature: Feature = {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [[
            [minX, minY],
            [maxX, minY],
            [maxX, maxY],
            [minX, maxY],
            [minX, minY],
          ]],
        },
      };
      flyToGeoJsonWithRetry(bboxFeature);
    }

    // Update area context with the selection name and full AOI selection data
    upsertContextByType({
      contextType: "area",
      content: selectionName,
      isAiContext: true,
      aoiSelection: selectionForContext,
    });

    // Add the AOISelection to the map store
    if (aois.length > 1) {
      setAoiSelection(selectionName, selectionForContext);
    }

    // If some AOIs failed, show a partial-failure message
    if (failures.length > 0 && failures.length < aois.length) {
      addMessage({
        type: "error",
        message: `Some areas could not be displayed on the map: ${failures.join(", ")}`,
        timestamp: streamMessage.timestamp,
      });
    } else if (failures.length === aois.length) {
      throw new Error("Failed to fetch geometry for all selected areas");
    }
  } catch (error) {
    console.error("Error processing pick_aoi artifact:", error);

    addMessage({
      type: "error",
      message: `AOI tool executed but failed to display on map: ${
        streamMessage.content || "Unknown location"
      }. Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      timestamp: streamMessage.timestamp,
    });
  }
}
