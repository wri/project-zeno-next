import { TerraDraw, TerraDrawPolygonMode } from "terra-draw";
import { TerraDrawMapLibreGLAdapter } from "terra-draw-maplibre-gl-adapter";
import { StateCreator } from "zustand";
import type { Map } from "maplibre-gl";
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
import { apiFetch } from "@/app/lib/api-client";

// Type for polygon features from TerraDraw
type PolygonFeature = {
  id: string | number;
  geometry: {
    type: "Polygon";
    coordinates: number[][][];
  };
  properties?: Record<string, unknown>;
};

/**
 * A polygon the user has finished drawing but not yet confirmed. It is
 * previewed on the map (standard bbox + outline + anchored label) while its
 * name is resolved, and persisted on confirm.
 */
export interface PendingDrawnArea {
  geometry: GeoJSON.FeatureCollection;
  bbox: [number, number, number, number];
  /** Resolved area name, or null while it is still being fetched. */
  name: string | null;
}

export interface DrawAreaSlice {
  terraDraw: TerraDraw | null;
  isDrawingMode: boolean;
  pendingDrawnArea: PendingDrawnArea | null;
  isResolvingName: boolean;
  validationError: {
    code: "too-small" | "too-large";
    area: number;
  } | null;
  createAreaFn:
    | ((data: CreateCustomAreaRequest) => Promise<CreateCustomAreaResponse>)
    | null;
  startDrawing: () => void;
  completeDrawing: () => void;
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

// Build a FeatureCollection of each feature's bounding box — the payload the
// area-name endpoint expects.
function buildBboxCollection(
  features: GeoJSON.Feature[]
): GeoJSON.FeatureCollection {
  const bboxFeatures = features.map((feature) => {
    const bounds = bbox(feature);
    return {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [bounds[0], bounds[1]],
            [bounds[0], bounds[3]],
            [bounds[2], bounds[3]],
            [bounds[2], bounds[1]],
            [bounds[0], bounds[1]],
          ],
        ],
      },
    } as GeoJSON.Feature;
  });

  return { type: "FeatureCollection", features: bboxFeatures };
}

// Resolve a human-readable name for the drawn area, falling back to a generated
// name if the request fails.
async function fetchAreaName(
  bboxCollection: GeoJSON.FeatureCollection
): Promise<string> {
  try {
    const response = await apiFetch("/api/custom_area_name", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bboxCollection),
    });

    if (!response.ok) {
      throw new Error("Failed to get area name");
    }

    const data = await response.json();
    return data.name;
  } catch (error) {
    console.error("Failed to get area name:", error);
    return generateRandomName();
  }
}

export const createDrawAreaSlice: StateCreator<
  MapState,
  [],
  [],
  DrawAreaSlice
> = (set, get) => ({
  terraDraw: null,
  isDrawingMode: false,
  pendingDrawnArea: null,
  isResolvingName: false,
  validationError: null,
  createAreaFn: null,

  initializeTerraDraw: (map) => {
    const terraDraw = new TerraDraw({
      adapter: new TerraDrawMapLibreGLAdapter({ map }),
      modes: [new TerraDrawPolygonMode()],
    });

    // Closing a polygon emits `finish` — treat that as "the shape is complete"
    // and capture it for preview/confirmation.
    terraDraw.on("finish", () => {
      get().completeDrawing();
    });

    set({ terraDraw });
  },

  startDrawing: () => {
    const terraDraw = getTerraDraw(get);
    terraDraw.start();
    terraDraw.setMode("polygon");

    set({
      isDrawingMode: true,
      validationError: null,
      pendingDrawnArea: null,
      isResolvingName: false,
    });
  },

  endDrawing: () => {
    const terraDraw = getTerraDraw(get);
    terraDraw.setMode("static");
    terraDraw.clear();
    terraDraw.stop();
    set({
      isDrawingMode: false,
      pendingDrawnArea: null,
      isResolvingName: false,
    });
    get().clearSelectionMode();
  },

  clearValidationError: () => {
    set({ validationError: null });
  },

  completeDrawing: () => {
    // Single entry point for "the shape is complete" — fired by terra-draw's
    // `finish` event (polygon closed) or the confirm-draw button. Validates the
    // shape, shows the standard preview immediately, and resolves the name in
    // the background.
    if (get().pendingDrawnArea) return; // already captured this session

    const terraDraw = getTerraDraw(get);
    const drawnFeatures = terraDraw.getSnapshot();

    const polygons = drawnFeatures.filter(
      (feature) => feature.geometry.type === "Polygon"
    ) as PolygonFeature[];

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
      get().endDrawing();
      return;
    }

    const bounds = bbox(featureCollection) as [number, number, number, number];

    // Show the preview immediately with a pending (null) name.
    set({
      pendingDrawnArea: {
        geometry: featureCollection,
        bbox: bounds,
        name: null,
      },
      isResolvingName: true,
    });

    // Stop terra-draw rendering its own polygon — the preview layer renders the
    // standard outline/bbox instead. Keep isDrawingMode true so the AOI select
    // layer stays disabled and the confirm/cancel controls remain available.
    terraDraw.setMode("static");
    terraDraw.clear();

    // Zoom to the completed shape.
    get().flyToGeoJson(featureCollection);

    // Resolve the name in the background; the label shows a loading state until
    // it returns. Ignore the result if the user cancelled/confirmed meanwhile.
    fetchAreaName(buildBboxCollection(features)).then((name) => {
      const pending = get().pendingDrawnArea;
      if (!pending || pending.geometry !== featureCollection) return;
      set({
        pendingDrawnArea: { ...pending, name },
        isResolvingName: false,
      });
    });
  },

  confirmDrawing: async () => {
    const pending = get().pendingDrawnArea;
    if (!pending) {
      get().endDrawing();
      return;
    }

    const requestData: CreateCustomAreaRequest = {
      name: pending.name ?? generateRandomName(),
      geometries: pending.geometry.features
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
