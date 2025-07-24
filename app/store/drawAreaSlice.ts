import { TerraDraw, TerraDrawPolygonMode } from "terra-draw";
import { TerraDrawMapLibreGLAdapter } from "terra-draw-maplibre-gl-adapter";
import { StateCreator } from "zustand";
import type { Map } from "maplibre-gl";
import { AOI } from "../types/chat";
import { generateRandomName } from "../utils/generateRandomName";
import type { MapState } from "./mapStore";

// Type for polygon features from TerraDraw
type PolygonFeature = {
  id: string | number;
  geometry: {
    type: "Polygon";
    coordinates: number[][][];
  };
  properties?: Record<string, unknown>;
};

export interface DrawAreaSlice {
  terraDraw: TerraDraw | null;
  isDrawingMode: boolean;
  startDrawing: () => void;
  confirmDrawing: () => void;
  cancelDrawing: () => void;
  initializeTerraDraw: (map: Map) => void;
  endDrawing: () => void;
}

// This ensures TerraDraw is initialized before use
function getTerraDraw(get: () => MapState) {
  const { terraDraw } = get();
  if (!terraDraw) {
    throw new Error("TerraDraw not initialized");
  }
  return terraDraw;
}

export const createDrawAreaSlice: StateCreator<
  MapState,
  [],
  [],
  DrawAreaSlice
> = (set, get) => ({
  terraDraw: null,
  isDrawingMode: false,

  initializeTerraDraw: (map) => {
    const terraDraw = new TerraDraw({
      adapter: new TerraDrawMapLibreGLAdapter({ map }),
      modes: [new TerraDrawPolygonMode()],
    });

    set({ terraDraw });
  },

  startDrawing: () => {
    const terraDraw = getTerraDraw(get);
    terraDraw.start();
    terraDraw.setMode("polygon");

    set({ isDrawingMode: true });
  },

  endDrawing: () => {
    const terraDraw = getTerraDraw(get);
    terraDraw.stop();
    set({ isDrawingMode: false });
    get().clearSelectionMode();
  },

  confirmDrawing: () => {
    const terraDraw = getTerraDraw(get);
    const drawnFeatures = terraDraw.getSnapshot();

    // No polygons drawn
    if (drawnFeatures.length === 0) {
      get().endDrawing();
      return;
    }

    // Filter for polygon features and cast to our type
    const polygons = drawnFeatures.filter(
      (feature) => feature.geometry.type === "Polygon"
    ) as PolygonFeature[];

    // Safeguard against no valid polygons found
    if (polygons.length === 0) {
      get().endDrawing();
      return;
    }

    const features: GeoJSON.Feature[] = polygons.map((polygon) => ({
      type: "Feature",
      id: polygon.id,
      geometry: {
        type: "Polygon",
        coordinates: polygon.geometry.coordinates,
      },
      properties: {},
    }));

    const featureCollection: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features,
    };

    const newArea: AOI = {
      name: generateRandomName(),
      geometry: featureCollection,
    };

    get().addCustomArea(newArea);

    get().endDrawing();
  },

  cancelDrawing: () => {
    get().endDrawing();
  },
});
