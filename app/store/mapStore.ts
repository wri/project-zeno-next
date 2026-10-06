import { create } from "zustand";
import { MapRef } from "react-map-gl/maplibre";
import bbox from "@turf/bbox";
import center from "@turf/center";
import { LayerId } from "../types/map";
import { DrawAreaSlice, createDrawAreaSlice } from "./drawAreaSlice";
import { UploadAreaSlice, createUploadAreaSlice } from "./uploadAreaSlice";
import {
  SelectAnalysisSlice,
  createSelectAnalysisSlice,
} from "./selectAnalysisSlice";
import { StateCreator } from "zustand";
import { showError } from "@/app/hooks/useErrorHandler";
import useSidebarStore from "@/app/store/sidebarStore";
import {
  CornerFootprint,
  MAP_LEGEND_ATTR,
  getMapCoveredLeftPx,
  getMapFitPadding,
} from "@/app/explorationLayout";
import {
  LayerManagerSlice,
  createLayerManagerSlice,
} from "./layerManagerSlice";

interface SelectionMode {
  type: "Drawing" | "Uploading" | undefined;
  name?: string;
}

interface MapSlice {
  mapRef: MapRef | null;
  /** The one boundary layer shown on the map (null = none). See `selectLayerOptions`. */
  selectAreaLayer: LayerId | null;
  reset: () => void;
  setMapRef: (mapRef: MapRef) => void;
  setSelectAreaLayer: (layerId: LayerId | null) => void;
  flyToGeoJson: (geoJson: GeoJSON.FeatureCollection | GeoJSON.Feature) => void;
  flyToCenter: (
    geoJson: GeoJSON.FeatureCollection | GeoJSON.Feature,
    zoom?: number
  ) => void;
  flyToGeoJsonWithRetry: (
    geoJson: GeoJSON.FeatureCollection | GeoJSON.Feature,
    maxRetries?: number
  ) => void;
  flyToBounds: (bounds: [[number, number], [number, number]]) => void;

  selectionMode: SelectionMode | undefined;
  setSelectionMode: (mode: SelectionMode | undefined) => void;
  clearSelectionMode: () => void;
}

export type MapState = MapSlice &
  DrawAreaSlice &
  UploadAreaSlice &
  LayerManagerSlice &
  SelectAnalysisSlice;

type MapInstance = ReturnType<MapRef["getMap"]>;
type Bounds = [[number, number], [number, number]];

/** How far the legend reaches into the map from its corner, if it's showing. */
function measureLegend(container: HTMLElement): CornerFootprint | null {
  const legend = container
    .querySelector(`[${MAP_LEGEND_ATTR}]`)
    ?.getBoundingClientRect();
  if (!legend?.width || !legend.height) return null;
  const map = container.getBoundingClientRect();
  return {
    fromRightPx: map.right - legend.left,
    fromBottomPx: map.bottom - legend.top,
  };
}

/**
 * fitBounds padding that keeps framed areas clear of the map's floating
 * chrome: the chat and catalog panels over its left edge (desktop only,
 * Chakra's md breakpoint: on mobile the chat is a bottom sheet) and the
 * legend in its bottom-right corner.
 */
function fitPadding(map: MapInstance, [sw, ne]: Bounds) {
  const {
    isChatFullSize,
    isChatCollapsed,
    dataCatalogOpen,
    areasPanelOpen,
    insightsPanelOpen,
  } = useSidebarStore.getState();
  const isDesktop = window.matchMedia("(min-width: 48rem)").matches;
  const coveredLeftPx = isDesktop
    ? getMapCoveredLeftPx(
        isChatFullSize,
        isChatCollapsed,
        dataCatalogOpen || areasPanelOpen || insightsPanelOpen
      )
    : 0;
  const container = map.getContainer();
  const swPx = map.project(sw);
  const nePx = map.project(ne);
  return getMapFitPadding({
    mapWidthPx: container.clientWidth,
    mapHeightPx: container.clientHeight,
    coveredLeftPx,
    legend: measureLegend(container),
    boundsPx: {
      width: Math.abs(nePx.x - swPx.x),
      height: Math.abs(swPx.y - nePx.y),
    },
  });
}

function showNavigationError(error: unknown) {
  console.error("Error framing the map on an area:", error);
  showError("Unable to navigate to the selected area on the map.", {
    title: "Map Navigation Error",
    duration: 5000,
  });
}

/**
 * Fit the map to bounds clear of its floating chrome. Waits a frame so the
 * legend has rendered any area just added: pick_aoi, uploads and the area
 * tools add the layer (and its legend chip) right before framing it.
 */
function fitBoundsClear(map: MapInstance, bounds: Bounds) {
  requestAnimationFrame(() => {
    try {
      map.fitBounds(bounds, {
        linear: true,
        padding: fitPadding(map, bounds),
        retainPadding: false,
        maxZoom: 16, // Prevent zooming in too much for very small areas
      });
    } catch (error) {
      showNavigationError(error);
    }
  });
}

const createMapSlice: StateCreator<MapState, [], [], MapSlice> = (
  set,
  get
) => ({
  mapRef: null,
  selectAreaLayer: "GADM",
  selectionMode: undefined,

  reset: () => {
    set({
      selectAreaLayer: "GADM",
      layers: [],
      geoJsonRegistry: [],
      // Clear the analysis selection so a new thread (which reseeds the
      // default dataset) doesn't resurrect a nudge from the previous one.
      analysisSelection: null,
    });
    get().clearSelectionMode();

    const { mapRef } = get();
    if (mapRef) {
      const map = mapRef.getMap();
      map.flyTo({
        center: [15, -10],
        zoom: 2,
      });
    }
  },

  setMapRef: (mapRef) => {
    set({ mapRef });
  },

  setSelectAreaLayer: (layerId) => {
    get().clearValidationError?.();
    set({ selectAreaLayer: layerId });
  },

  setSelectionMode: (selectionMode) => {
    set({ selectionMode: selectionMode });
  },

  clearSelectionMode: () => {
    set({ selectionMode: undefined });
  },

  flyToGeoJson: (geoJson) => {
    const { mapRef } = get();
    if (!mapRef) {
      console.warn("Map ref not available for flying to GeoJSON");
      return;
    }

    try {
      // Use Turf.js bbox function to calculate bounding box
      const bboxArray = bbox(geoJson);
      // bbox returns [minX, minY, maxX, maxY] which is [west, south, east, north]
      const bounds: [[number, number], [number, number]] = [
        [bboxArray[0], bboxArray[1]], // southwest
        [bboxArray[2], bboxArray[3]], // northeast
      ];

      fitBoundsClear(mapRef.getMap(), bounds);
    } catch (error) {
      showNavigationError(error);
    }
  },

  flyToBounds: (bounds) => {
    const { mapRef } = get();
    if (!mapRef) {
      console.warn("Map ref not available for flyToBounds");
      return;
    }
    const [[west, south], [east, north]] = bounds;
    let eastUpdated = east;
    // MapLibre doesn't handle west > east wrapping — normalise by adding 360 to east.
    if (west > east) eastUpdated += 360;
    fitBoundsClear(mapRef.getMap(), [
      [west, south],
      [eastUpdated, north],
    ]);
  },

  flyToGeoJsonWithRetry: (geoJson, maxRetries = 5) => {
    const { mapRef, flyToGeoJson } = get();

    if (mapRef) {
      flyToGeoJson(geoJson);
      return;
    }

    if (maxRetries <= 0) {
      console.warn("Max retries reached, map ref still not available");
      showError(
        "The map failed to load properly. Please refresh the page and try again.",
        { title: "Map Loading Error", duration: 5000 }
      );
      return;
    }

    console.log(
      `Map ref not ready, retrying in 200ms (${maxRetries} retries left)`
    );
    setTimeout(() => {
      get().flyToGeoJsonWithRetry(geoJson, maxRetries - 1);
    }, 200);
  },

  flyToCenter: (geoJson, zoom = 12) => {
    const { mapRef } = get();
    if (!mapRef) {
      console.warn("Map ref not available for flying to center");
      return;
    }

    try {
      // Use Turf.js center function to calculate center point
      const centerPoint = center(geoJson);
      const [lng, lat] = centerPoint.geometry.coordinates;

      const map = mapRef.getMap();

      // Fly to the center point
      map.jumpTo({
        center: [lng, lat],
        zoom: zoom,
      });
    } catch (error) {
      console.error("Error flying to GeoJSON center:", error);
      showError("Unable to navigate to the selected location on the map.", {
        title: "Map Navigation Error",
        duration: 5000,
      });
    }
  },
});

const useMapStore = create<MapState>()((...a) => ({
  ...createMapSlice(...a),
  ...createDrawAreaSlice(...a),
  ...createUploadAreaSlice(...a),
  ...createLayerManagerSlice(...a),
  ...createSelectAnalysisSlice(...a),
}));

export default useMapStore;
