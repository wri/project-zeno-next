import { Feature, FeatureCollection } from "geojson";
import {
  ChatMessage,
  StreamMessage,
  AOI,
  AOISelection,
} from "@/app/types/chat";
import useMapStore from "../mapStore";
import { fetchGeometry } from "@/app/utils/geometryClient";
import { unionAoiBboxes } from "@/app/utils/bboxUtils";
import { GeoJsonEntry } from "../layerManagerSlice";
import { selectLayerOptions } from "@/app/types/map";

const GLOBAL_LAYER_ID = "Global Layer";

/**
 * A global query selects every country on the planet, which the backend renders
 * as a single GADM vector-tile layer instead of ~250 per-country GeoJSON fetches.
 * The backend's canonical selection name is "All countries in the world" (see the
 * DebugToastsPanel fixture); the bare "all countries" is accepted for resilience.
 *
 * Matching is exact (not substring) on purpose: a sub-global selection such as
 * "All countries in the EU" must NOT be treated as the whole world — doing so
 * would swap its real geometry for the global GADM layer. Previously this checked
 * `=== "all countries"`, which never matched the canonical name and caused the FE
 * to fetch and render all ~250 country polygons — an out-of-memory renderer crash.
 */
export function isGlobalQuery(name: string): boolean {
  const normalized = name.toLowerCase().trim();
  return (
    normalized === "all countries" ||
    normalized === "all countries in the world"
  );
}

/**
 * Fetch geometry for a single AOI and add it to the layer manager
 * Returns the raw geometry data (FeatureCollection or Feature) for combined
 * bounds computation.
 * @param selectionName - The name of the selection of AOIs. Used in multi-area selection.
 */
async function fetchAndRegisterAoi(
  aoi: AOI,
  addToRegistry: (entry: GeoJsonEntry) => void
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
  console.log(
    "[pickAoi] called with:",
    JSON.stringify(
      { aoi: streamMessage.aoi, aoi_selection: streamMessage.aoi_selection },
      null,
      2
    )
  );
  try {
    const { flyToGeoJsonWithRetry, flyToBounds, addToRegistry, addLayer } =
      useMapStore.getState();

    // Prefer the new multi-AOI aoi_selection, fall back to single aoi
    const aoiSelection: AOISelection | undefined = streamMessage.aoi_selection;
    const aois: AOI[] =
      aoiSelection?.aois ??
      (streamMessage.aoi ? [streamMessage.aoi as AOI] : []);
    const selectionName: string =
      aoiSelection?.name ?? (aois[0]?.name || "Unknown");

    // Global query: render a vector tile layer instead of fetching per-country GeoJSON
    if (isGlobalQuery(selectionName)) {
      const gadm = selectLayerOptions.find((o) => o.id === "GADM")!;
      const worldBbox: Feature = {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [-180, -85],
              [180, -85],
              [180, 85],
              [-180, 85],
              [-180, -85],
            ],
          ],
        },
      };

      // Use selectionName (the assistant-provided name, e.g. "All countries
      // in the world") for the layer's display name. The id stays as the
      // stable GLOBAL_LAYER_ID constant so re-adding a global selection
      // replaces the existing layer instead of stacking duplicates.
      // The visible layer IS the scope — no separate context item.
      addLayer({
        id: GLOBAL_LAYER_ID,
        name: selectionName,
        type: "vector",
        visible: true,
        tileUrl: gadm.url,
        sourceLayer: gadm.sourceLayer,
        selectionName,
        aoiSelection: aoiSelection ?? { name: selectionName, aois },
      });

      flyToGeoJsonWithRetry(worldBbox);

      addMessage({
        type: "area-card",
        message: "",
        aoiSelection: aoiSelection ?? { name: selectionName, aois },
        timestamp: streamMessage.timestamp,
      });

      return;
    }

    if (aois.length === 0) {
      throw new Error("No AOI data found in stream message");
    }

    // Fetch geometry for all AOIs in parallel
    const results = await Promise.allSettled(
      aois.map((aoi) => fetchAndRegisterAoi(aoi, addToRegistry))
    );

    // Collect all raw geometry data for combined bounds, track failures
    const allGeoData: (FeatureCollection | Feature)[] = [];
    const failures: string[] = [];

    results.forEach((result, idx) => {
      if (result.status === "fulfilled") {
        allGeoData.push(result.value);
      } else {
        const aoiName = aois[idx]?.name ?? `AOI ${idx}`;
        console.error(
          `Failed to fetch geometry for "${aoiName}":`,
          result.reason
        );
        failures.push(aoiName);
      }
    });

    // Only add the layer if at least one AOI succeeded, with only successful refs
    const successfulAois = aois.filter(
      (_, idx) => results[idx].status === "fulfilled"
    );
    const successfulRefs = successfulAois.map((aoi) => ({
      name: aoi.name,
      source: aoi.source,
    }));

    // The visible layer IS the scope — no separate context item. The layer id
    // is the selection name, so re-picking the same selection replaces it
    // rather than stacking a duplicate; differently-named selections stack.
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

    console.log(
      "[pickAoi] successfulAois bbox check:",
      successfulAois.map((a) => ({ name: a.name, bbox: a.bbox }))
    );

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
      console.log("[pickAoi] calling flyToBounds:", typeof flyToBounds, [
        [west, south],
        [east, north],
      ]);
      flyToBounds([
        [west, south],
        [east, north],
      ]);
    } else if (allGeoData.length > 0) {
      flyToGeoJsonWithRetry(allGeoData[0]);
    }

    // Only show the area card if at least one AOI rendered successfully,
    // and only include the successful AOIs in the card.
    if (successfulAois.length > 0) {
      addMessage({
        type: "area-card",
        message: "",
        aoiSelection: { name: selectionName, aois: successfulAois },
        timestamp: streamMessage.timestamp,
      });
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
