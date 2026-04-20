import { create } from "zustand";
import { MapRef } from "react-map-gl/maplibre";
import bbox from "@turf/bbox";
import center from "@turf/center";
import { LayerId } from "../types/map";
import { DrawAreaSlice, createDrawAreaSlice } from "./drawAreaSlice";
import { UploadAreaSlice, createUploadAreaSlice } from "./uploadAreaSlice";
import { StateCreator } from "zustand";
import { showError } from "@/app/hooks/useErrorHandler";
import { LayerManagerSlice, createLayerManagerSlice } from "./layerManagerSlice";

interface SelectionMode {
  type: "Selecting" | "Drawing" | "Uploading" | undefined;
  name?: string;
}

interface MapSlice {
  mapRef: MapRef | null;
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

export type MapState = MapSlice & DrawAreaSlice & UploadAreaSlice & LayerManagerSlice;

const createMapSlice: StateCreator<MapState, [], [], MapSlice> = (
  set,
  get
) => ({
  mapRef: null,
  selectAreaLayer: null,
  selectionMode: undefined,

  reset: () => {
    set({
      selectAreaLayer: null,
      layers: [],
      geoJsonRegistry: [],
    });
    get().clearSelectionMode();

    const { mapRef } = get();
    if (mapRef) {
      const map = mapRef.getMap();
      map.flyTo({
        center: [0, 0],
        zoom: 0,
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

      const map = mapRef.getMap();

      // Fit the map to the bounds with some padding
      map.fitBounds(bounds, {
        linear: true,
        padding: { top: 50, bottom: 50, left: 50, right: 50 },
        maxZoom: 16, // Prevent zooming in too much for very small areas
      });
    } catch (error) {
      console.error("Error flying to GeoJSON bounds:", error);
      showError("Unable to navigate to the selected area on the map.", {
        title: "Map Navigation Error",
        duration: 5000,
      });
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
    mapRef.getMap().fitBounds([[west, south], [eastUpdated, north]], {
      linear: true,
      padding: { top: 50, bottom: 50, left: 50, right: 50 },
      maxZoom: 16,
    });
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
}));

export default useMapStore;
