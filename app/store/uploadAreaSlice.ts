import { StateCreator } from "zustand";
import {
  ACCEPTED_FILE_TYPES,
  MAX_AREA_KM2,
  MAX_FILE_SIZE,
  MAX_FILE_SIZE_MB,
  MIN_AREA_KM2,
} from "../constants/custom-areas";
import type { MapState } from "./mapStore";
import { generateRandomName } from "../utils/generateRandomName";
import { calculateAreaKm2 } from "../utils/calculateAreaKm2";
import { formatAreaWithUnits } from "../utils/formatArea";
import type {
  CreateCustomAreaRequest,
  CreateCustomAreaResponse,
} from "../schemas/api/custom_areas/post";
import { Polygon } from "geojson";

type UploadErrorType =
  | "none"
  | "file-too-large"
  | "file-empty"
  | "file-format-invalid"
  | "file-area-too-small"
  | "file-area-too-large"
  | "failed-to-send";

export interface UploadAreaSlice {
  dialogVisible: boolean;
  toggleUploadAreaDialog: () => void;
  isUploading: boolean;
  isFileSelected: boolean;
  errorType: UploadErrorType;
  errorMessage: string;
  filename: string;
  selectedFile: File | null;
  validatedGeoJson: Polygon[] | null;
  createAreaFn:
    | ((data: CreateCustomAreaRequest) => Promise<CreateCustomAreaResponse>)
    | null;
  setError: (errorType: UploadErrorType, message?: string) => void;
  clearError: () => void;
  handleFile: (file: File) => void;
  uploadFile: () => Promise<void>;
  clearFileState: () => void;
  setCreateAreaFn: (
    fn: (data: CreateCustomAreaRequest) => Promise<CreateCustomAreaResponse>
  ) => void;
}

export const createUploadAreaSlice: StateCreator<
  MapState,
  [],
  [],
  UploadAreaSlice
> = (set, get) => ({
  dialogVisible: false,
  isUploading: false,
  isFileSelected: false,
  errorType: "none",
  errorMessage: "",
  filename: "",
  selectedFile: null,
  validatedGeoJson: null,
  createAreaFn: null,

  toggleUploadAreaDialog: () =>
    set((state) => {
      get().clearValidationError?.();
      if (state.dialogVisible) {
        get().clearFileState();
        get().clearSelectionMode();
      }
      return { dialogVisible: !state.dialogVisible };
    }),

  setError: (errorType: UploadErrorType, message = "") =>
    set({ errorType, errorMessage: message }),

  clearError: () => set({ errorType: "none", errorMessage: "" }),

  setCreateAreaFn: (fn) => {
    set({ createAreaFn: fn });
  },

  handleFile: async (file: File) => {
    const { clearError } = get();

    clearError();

    if (file.size > MAX_FILE_SIZE) {
      get().setError(
        "file-too-large",
        `File size exceeds ${MAX_FILE_SIZE_MB}MB limit`
      );
      set({
        selectedFile: null,
        filename: "",
        isFileSelected: false,
      });
      return;
    }

    if (file.size === 0) {
      get().setError("file-empty", "File is empty");
      set({
        selectedFile: null,
        filename: "",
        isFileSelected: false,
      });
      return;
    }

    if (
      !ACCEPTED_FILE_TYPES.some((type) =>
        file.name.toLowerCase().endsWith(type)
      )
    ) {
      get().setError(
        "file-format-invalid",
        `Only ${ACCEPTED_FILE_TYPES.join(", ")} files are supported`
      );
      set({
        selectedFile: null,
        filename: "",
        isFileSelected: false,
      });
      return;
    }

    try {
      const fileContent = await file.text();
      let geoJsonData: GeoJSON.GeoJSON;

      try {
        geoJsonData = JSON.parse(fileContent);
      } catch {
        get().setError("file-format-invalid", "Invalid JSON format");
        set({
          selectedFile: null,
          filename: "",
          isFileSelected: false,
        });
        return;
      }

      if (!geoJsonData || typeof geoJsonData !== "object") {
        get().setError("file-format-invalid", "Invalid GeoJSON format");
        set({
          selectedFile: null,
          filename: "",
          isFileSelected: false,
        });
        return;
      }

      const features: GeoJSON.Feature[] = [];

      if (geoJsonData.type === "Feature") {
        const feature = geoJsonData as GeoJSON.Feature;
        if (
          feature.geometry?.type === "Polygon" ||
          feature.geometry?.type === "MultiPolygon"
        ) {
          features.push(feature);
        }
      } else if (geoJsonData.type === "FeatureCollection") {
        const featureCollection = geoJsonData as GeoJSON.FeatureCollection;
        features.push(
          ...featureCollection.features.filter(
            (feature) =>
              feature.geometry?.type === "Polygon" ||
              feature.geometry?.type === "MultiPolygon"
          )
        );
      } else if (
        geoJsonData.type === "Polygon" ||
        geoJsonData.type === "MultiPolygon"
      ) {
        features.push({
          type: "Feature",
          geometry: geoJsonData as GeoJSON.Polygon | GeoJSON.MultiPolygon,
          properties: {},
        });
      }

      if (features.length === 0) {
        get().setError(
          "file-format-invalid",
          "No valid Polygon or MultiPolygon features found"
        );
        set({
          selectedFile: null,
          filename: "",
          isFileSelected: false,
        });
        return;
      }

      const areaFeatureCollection: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features,
      };

      const areaSizeKm2 = calculateAreaKm2(areaFeatureCollection);

      if (areaSizeKm2 < MIN_AREA_KM2) {
        get().setError(
          "file-area-too-small",
          `Area is too small (${formatAreaWithUnits(
            areaSizeKm2
          )}). Minimum area is ${formatAreaWithUnits(MIN_AREA_KM2)}.`
        );
        set({
          selectedFile: null,
          filename: "",
          isFileSelected: false,
        });
        return;
      }

      if (areaSizeKm2 > MAX_AREA_KM2) {
        get().setError(
          "file-area-too-large",
          `Area is too large (${formatAreaWithUnits(
            areaSizeKm2
          )}). Maximum area is ${formatAreaWithUnits(MAX_AREA_KM2)}.`
        );
        set({
          selectedFile: null,
          filename: "",
          isFileSelected: false,
        });
        return;
      }

      // Filter for only Polygon geometries
      const polygonGeometries = features
        .map((feature) => feature.geometry)
        .filter((geometry): geometry is Polygon => geometry.type === "Polygon");

      if (polygonGeometries.length === 0) {
        get().setError(
          "file-format-invalid",
          "No valid Polygon features found"
        );
        set({
          selectedFile: null,
          filename: "",
          isFileSelected: false,
        });
        return;
      }

      // All validations passed
      set({
        selectedFile: file,
        filename: file.name,
        isFileSelected: true,
        errorType: "none",
        errorMessage: "",
        validatedGeoJson: polygonGeometries,
      });
    } catch (error) {
      console.error("File validation error:", error);
      get().setError("file-format-invalid", "Failed to read file content");
      set({
        selectedFile: null,
        filename: "",
        isFileSelected: false,
      });
    }
  },

  uploadFile: async () => {
    const { validatedGeoJson, setError, createAreaFn } = get();

    if (!validatedGeoJson) {
      setError("file-empty", "No validated file data available");
      return;
    }

    if (!createAreaFn) {
      setError("failed-to-send", "Upload function not available");
      return;
    }

    set({ isUploading: true });

    try {
      const requestData: CreateCustomAreaRequest = {
        name: generateRandomName(),
        geometries: validatedGeoJson,
      };

      await createAreaFn(requestData);
      get().clearFileState();
      get().clearSelectionMode();
      set({ dialogVisible: false });
    } catch (error) {
      console.error("Upload error:", error);
      setError("failed-to-send", "Failed to process file. Please try again.");
    } finally {
      set({ isUploading: false });
    }
  },

  clearFileState: () => {
    set({
      selectedFile: null,
      filename: "",
      isFileSelected: false,
      errorType: "none",
      errorMessage: "",
      isUploading: false,
      validatedGeoJson: null,
    });
  },
});
