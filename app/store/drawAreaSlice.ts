import { TerraDraw, TerraDrawPolygonMode } from "terra-draw";
import { TerraDrawMapLibreGLAdapter } from "terra-draw-maplibre-gl-adapter";
import { StateCreator } from "zustand";
import type { Map } from "maplibre-gl";
import { AOI } from "../types/chat";
import { generateRandomName } from "../utils/generateRandomName";
import bbox from "@turf/bbox";
import type { MapState } from "./mapStore";
import { calculateAreaKm2 } from "../utils/calculateAreaKm2";
import { MIN_AREA_KM2, MAX_AREA_KM2 } from "../constants/custom-areas";
import type {
  CreateCustomAreaRequest,
  CreateCustomAreaResponse,
} from "../schemas/api/custom_areas/post";
import { Polygon } from "geojson";

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
  validationError: {
    code: "too-small" | "too-large";
    area: number;
  } | null;
  createAreaFn:
    | ((data: CreateCustomAreaRequest) => Promise<CreateCustomAreaResponse>)
    | null;
  startDrawing: () => void;
  confirmDrawing: () => Promise<CreateCustomAreaResponse | undefined>;
  cancelDrawing: () => void;
  initializeTerraDraw: (map: Map) => void;
  endDrawing: () => void;
  clearValidationError: () => void;
  setCreateAreaFn: (
    fn: (data: CreateCustomAreaRequest) => Promise<CreateCustomAreaResponse>
  ) => void;
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
  validationError: null,
  createAreaFn: null,

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

    set({ isDrawingMode: true, validationError: null });
  },

  endDrawing: () => {
    const terraDraw = getTerraDraw(get);
    terraDraw.setMode("static");
    terraDraw.stop();
    set({ isDrawingMode: false });
    get().clearSelectionMode();
  },

  clearValidationError: () => {
    set({ validationError: null });
  },

  confirmDrawing: async () => {
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

    const areaSizeKm2 = calculateAreaKm2(featureCollection);

    if (areaSizeKm2 < MIN_AREA_KM2 || areaSizeKm2 > MAX_AREA_KM2) {
      set({
        validationError: {
          code: areaSizeKm2 < MIN_AREA_KM2 ? "too-small" : "too-large",
          area: areaSizeKm2,
        },
      });
      terraDraw.clear();
      get().endDrawing();
      return;
    }

    // Calculate bbox for each feature
    const bboxFeatures = features.map(feature => {
      const bounds = bbox(feature);
      return {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [[
            [bounds[0], bounds[1]],
            [bounds[0], bounds[3]],
            [bounds[2], bounds[3]],
            [bounds[2], bounds[1]],
            [bounds[0], bounds[1]]
          ]]
        }
      } as GeoJSON.Feature;
    });

    const bboxCollection: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: bboxFeatures
    };

    let areaName: string;
    try {
      // Get area name from API
      const response = await fetch("/api/proxy/custom_area_name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bboxCollection),
      });

      if (!response.ok) {
        throw new Error("Failed to get area name");
      }

      const data = await response.json();
      areaName = data.name;
    } catch (error) {
      console.error("Failed to get area name:", error);
      areaName = generateRandomName();
    }

    const newArea: AOI = {
      name: areaName,
      src_id: areaName, // Use generated name as unique identifier for now
      source: "custom",
      subtype: "custom-area",
      geometry: featureCollection,
    };

    const requestData: CreateCustomAreaRequest = {
      name: newArea.name,
      geometries: featureCollection.features
        .map((feature) => feature.geometry)
        .filter((geometry): geometry is Polygon => geometry.type === "Polygon"),
    };

    const createAreaFn = get().createAreaFn;
    let result;
    if (createAreaFn) {
      result = await createAreaFn(requestData);
    }

    get().endDrawing();
    return result;
  },

  cancelDrawing: () => {
    get().clearValidationError();
    get().endDrawing();
  },

  setCreateAreaFn: (fn) => {
    set({ createAreaFn: fn });
  },
});
