import { TerraDraw, TerraDrawPolygonMode } from "terra-draw";
import { TerraDrawMapLibreGLAdapter } from "terra-draw-maplibre-gl-adapter";
import { StateCreator } from "zustand";
import type { Map } from "maplibre-gl";

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

// Combined state interface for accessing other slice methods
interface DrawAreaWithMapState extends DrawAreaSlice {
  addCustomArea: (area: GeoJSON.Feature) => void;
  clearSelectionMode: () => void;
}

// This ensures TerraDraw is initialized before use
function getTerraDraw(get: () => DrawAreaWithMapState) {
  const { terraDraw } = get();
  if (!terraDraw) {
    throw new Error("TerraDraw not initialized");
  }
  return terraDraw;
}

export const createDrawAreaSlice: StateCreator<
  DrawAreaWithMapState,
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

    const coordinates = polygons.map((polygon) => polygon.geometry.coordinates);
    const firstPolygonId = polygons[0].id || "polygon-1";

    const newArea: GeoJSON.Feature = {
      type: "Feature",
      id: firstPolygonId,
      geometry: {
        type: "MultiPolygon",
        coordinates,
      },
      properties: {},
    };

    get().addCustomArea(newArea);

    get().endDrawing();
  },

  cancelDrawing: () => {
    get().endDrawing();
  },
});
