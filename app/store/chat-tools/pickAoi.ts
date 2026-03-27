import { Feature, FeatureCollection, Polygon } from "geojson";
import {
  ChatMessage,
  StreamMessage,
  AOI,
  AOISelection,
} from "@/app/types/chat";
import useMapStore from "../mapStore";
import useContextStore from "../contextStore";
import { fetchGeometry } from "@/app/utils/geometryClient";
import bbox from "@turf/bbox";
import { GeoJsonEntry } from "../layerManagerSlice";

// Sentinel src_id the agent passes when the query scope is global (all countries).
// No geometry fetch is attempted for this value — the FE zooms to world and
// adds the layer to context without any map features.
export const GADM_GLOBAL_SRC_ID = "gadm-global";

/**
 * Fetch geometry for a single AOI and add it to the layer manager
 * Returns the raw geometry data (FeatureCollection or Feature) for combined
 * bounds computation.
 */
async function fetchAndRegisterAoi(
  aoi: AOI,
  addToRegistry: (entry: GeoJsonEntry) => void,
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

  addToRegistry({
    ref: { name: aoi.name, source: aoi.source },
    data: geoJsonData,
    srcId: aoi.src_id,
    subtype: aoi.subtype,
  });

  return geoJsonData;
}

export async function pickAoiTool(
  streamMessage: StreamMessage,
  addMessage: (message: Omit<ChatMessage, "id">) => void,
) {
  try {
    const { flyToGeoJsonWithRetry, addToRegistry, addLayer } =
      useMapStore.getState();
    const { upsertContextByType } = useContextStore.getState();

    // Prefer the new multi-AOI aoi_selection, fall back to single aoi
    const aoiSelection: AOISelection | undefined = streamMessage.aoi_selection;
    const aois: AOI[] =
      aoiSelection?.aois ??
      (streamMessage.aoi ? [streamMessage.aoi as AOI] : []);
    const selectionName: string =
      aoiSelection?.name ?? (aois[0]?.name || "Unknown");

    if (aois.length === 0) {
      throw new Error("No AOI data found in stream message");
    }

    // Build an AOISelection to store on the context (even for single-AOI fallback)
    const selectionForContext: AOISelection = aoiSelection ?? {
      name: selectionName,
      aois,
    };

    // Global AOIs have no fetchable geometry — separate them out and skip the
    // fetch. Everything else (layer registration, context, zoom) follows the
    // normal path.
    const globalAois = aois.filter((a) => a.src_id === GADM_GLOBAL_SRC_ID);
    const fetchableAois = aois.filter((a) => a.src_id !== GADM_GLOBAL_SRC_ID);

    // Fetch geometry for all non-global AOIs in parallel
    const results = await Promise.allSettled(
      fetchableAois.map((aoi) => fetchAndRegisterAoi(aoi, addToRegistry)),
    );

    // Collect geometry data for bbox computation; track failures
    const allGeoData: (FeatureCollection | Feature)[] = [];
    const failures: string[] = [];

    results.forEach((result, idx) => {
      if (result.status === "fulfilled") {
        allGeoData.push(result.value);
      } else {
        const aoiName = fetchableAois[idx]?.name ?? `AOI ${idx}`;
        console.error(
          `Failed to fetch geometry for "${aoiName}":`,
          result.reason,
        );
        failures.push(aoiName);
      }
    });

    // Successful fetched AOIs + global AOIs all belong to this layer
    const successfulFetchedAois = fetchableAois.filter(
      (_, idx) => results[idx].status === "fulfilled",
    );
    const successfulRefs = successfulFetchedAois.map((aoi) => ({
      name: aoi.name,
      source: aoi.source,
    }));
    const allIncludedAois = [...successfulFetchedAois, ...globalAois];

    if (successfulRefs.length > 0 || globalAois.length > 0) {
      addLayer({
        id: selectionName,
        name: selectionName,
        type: "geojson",
        visible: true,
        featureRefs: successfulRefs,
        ...(allIncludedAois.length > 1 && {
          selectionName,
          aoiSelection: { name: selectionName, aois: allIncludedAois },
        }),
      });
    }

    // Zoom: world view for global selections, computed bbox for normal ones
    if (globalAois.length > 0 && allGeoData.length === 0) {
      const worldPolygon: Feature<Polygon> = {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
            [[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]],
          ],
        },
      };
      flyToGeoJsonWithRetry(worldPolygon);
    } else if (allGeoData.length > 0) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const geoData of allGeoData) {
        const b = bbox(geoData);
        if (b[0] < minX) minX = b[0];
        if (b[1] < minY) minY = b[1];
        if (b[2] > maxX) maxX = b[2];
        if (b[3] > maxY) maxY = b[3];
      }
      const bboxFeature: Feature = {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
            [[minX, minY], [maxX, minY], [maxX, maxY], [minX, maxY], [minX, minY]],
          ],
        },
      };
      flyToGeoJsonWithRetry(bboxFeature);
    }

    // Update area context
    upsertContextByType({
      contextType: "area",
      content: selectionName,
      isAiContext: true,
      aoiSelection: selectionForContext,
    });

    if (failures.length > 0 && failures.length < fetchableAois.length) {
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
