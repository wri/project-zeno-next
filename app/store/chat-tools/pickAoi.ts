import { Feature, FeatureCollection } from "geojson";
import { ChatMessage, StreamMessage, AOI, AOISelection } from "@/app/types/chat";
import useMapStore from "../mapStore";
import useContextStore from "../contextStore";
import { fetchGeometry } from "@/app/utils/geometryClient";
import { unionAoiBboxes } from "@/app/utils/bboxUtils";
import { GeoJsonEntry } from "../layerManagerSlice";
import { selectLayerOptions } from "@/app/types/map";

const GLOBAL_LAYER_ID = "global-layer";
const GLOBAL_LAYER_NAME = "Global Layer";

function isGlobalQuery(name: string): boolean {
  return name.toLowerCase() === "all countries in the world";
}

/**
 * Fetch geometry for a single AOI and add it to the layer manager
 * Returns the raw geometry data (FeatureCollection or Feature) for combined
 * bounds computation.
 * @param selectionName - The name of the selection of AOIs. Used in multi-area selection.
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
  addMessage: (message: Omit<ChatMessage, "id">) => void
) {
  console.log("[pickAoi] called with:", JSON.stringify({ aoi: streamMessage.aoi, aoi_selection: streamMessage.aoi_selection }, null, 2));
  try {
    const { flyToGeoJsonWithRetry, flyToBounds, addToRegistry, addLayer } = useMapStore.getState();
    const { upsertContextByType } = useContextStore.getState();

    // Prefer the new multi-AOI aoi_selection, fall back to single aoi
    const aoiSelection: AOISelection | undefined = streamMessage.aoi_selection;
    const aois: AOI[] = aoiSelection?.aois ?? (streamMessage.aoi ? [streamMessage.aoi as AOI] : []);
    const selectionName: string = aoiSelection?.name ?? (aois[0]?.name || "Unknown");

    // Global query: render a vector tile layer instead of fetching per-country GeoJSON
    if (isGlobalQuery(selectionName)) {
      const gadm = selectLayerOptions.find((o) => o.id === "GADM")!;
      const worldBbox: Feature = {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [[
            [-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85],
          ]],
        },
      };

      addLayer({
        id: GLOBAL_LAYER_ID,
        name: GLOBAL_LAYER_NAME,
        type: "vector",
        visible: true,
        tileUrl: gadm.url,
        sourceLayer: gadm.sourceLayer,
      });

      flyToGeoJsonWithRetry(worldBbox);

      upsertContextByType({
        contextType: "area",
        content: GLOBAL_LAYER_NAME,
        isAiContext: true,
        aoiSelection: aoiSelection ?? { name: GLOBAL_LAYER_NAME, aois },
      });

      return;
    }

    if (aois.length === 0) {
      throw new Error("No AOI data found in stream message");
    }

    // Build an AOISelection to store on the context (even for single-AOI fallback)
    const selectionForContext: AOISelection = aoiSelection ?? {
      name: selectionName,
      aois,
    };

    // Fetch geometry for all AOIs in parallel
    const results = await Promise.allSettled(
      aois.map((aoi) => fetchAndRegisterAoi(aoi, addToRegistry))
    )

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

    // Only add the layer if at least one AOI succeeded, with only successful refs
    const successfulAois = aois.filter((_, idx) => results[idx].status === "fulfilled");
    const successfulRefs = successfulAois.map((aoi) => ({ name: aoi.name, source: aoi.source }));

    if (successfulRefs.length > 0) {
      addLayer({
        id: selectionName,
        name: selectionName,
        type: "geojson",
        visible: true,
        featureRefs: successfulRefs,
        selectionName,
        aoiSelection: { name: selectionName, aois: successfulAois },
      });
    }

    console.log("[pickAoi] successfulAois bbox check:", successfulAois.map((a) => ({ name: a.name, bbox: a.bbox })));

    // Fly to the combined bounds using backend-provided bbox values.
    // Using aoi.bbox directly preserves dateline-crossing extents (west > east),
    // which fitBounds handles natively. Turf bbox would wrap around the world instead.
    const unionBbox = unionAoiBboxes(successfulAois);
    if (unionBbox) {
      const [west, south, north] = [unionBbox[0], unionBbox[1], unionBbox[3]];
      let east = unionBbox[2];
      // flyToBounds (and mapStore's fitBounds wrapper) expects east <= 180;
      // subtract 360 to re-wrap when the union crossed the antimeridian.
      if (east > 180) east -= 360;
      console.log("[pickAoi] calling flyToBounds:", typeof flyToBounds, [[west, south], [east, north]]);
      flyToBounds([[west, south], [east, north]]);
    } else if (allGeoData.length > 0) {
      flyToGeoJsonWithRetry(allGeoData[0]);
    }

    // Update area context with the selection name and full AOI selection data
    upsertContextByType({
      contextType: "area",
      content: selectionName,
      isAiContext: true,
      aoiSelection: selectionForContext,
    });



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
