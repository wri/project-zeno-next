import { StateCreator } from "zustand";
import {
  ACCEPTED_FILE_TYPES,
  BATCH_UPLOAD_FILE_TYPES,
  BATCH_UPLOAD_MAX_FILE_SIZE,
  BATCH_UPLOAD_MAX_FILE_SIZE_MB,
  MAX_AREA_KM2,
  MAX_FILE_SIZE,
  MAX_FILE_SIZE_MB,
  MIN_AREA_KM2,
} from "../constants/custom-areas";
import {
  AreaUploadError,
  uploadCustomAreasFile,
} from "../lib/custom-areas-upload";
import type { UploadCustomAreasResponse } from "../schemas/api/custom_areas/upload";
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

/** Every file type the upload dialog accepts. */
export const UPLOAD_DIALOG_FILE_TYPES = [
  ...ACCEPTED_FILE_TYPES,
  ...BATCH_UPLOAD_FILE_TYPES,
];

export function isBatchUploadFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  return BATCH_UPLOAD_FILE_TYPES.some((type) => lower.endsWith(type));
}

export interface UploadAreaSlice {
  dialogVisible: boolean;
  toggleUploadAreaDialog: () => void;
  isUploading: boolean;
  isFileSelected: boolean;
  errorType: UploadErrorType;
  errorMessage: string;
  /** Per-row problems the backend reported for a rejected CSV/shapefile. */
  errorDetails: string[];
  filename: string;
  selectedFile: File | null;
  validatedGeoJson: Polygon[] | null;
  createAreaFn:
    | ((data: CreateCustomAreaRequest) => Promise<CreateCustomAreaResponse>)
    | null;
  setError: (
    errorType: UploadErrorType,
    message?: string,
    details?: string[]
  ) => void;
  clearError: () => void;
  handleFile: (file: File) => void;
  uploadFile: () => Promise<CreateCustomAreaResponse | undefined>;
  uploadBatchFile: () => Promise<UploadCustomAreasResponse | undefined>;
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
  errorDetails: [],
  filename: "",
  selectedFile: null,
  validatedGeoJson: null,
  createAreaFn: null,

  toggleUploadAreaDialog: () =>
    set((state) => {
      // Closing mid-upload would reset the dialog while the request still
      // completes on the backend: a re-upload duplicates the batch, and a late
      // failure writes errors into a closed dialog.
      if (state.dialogVisible && state.isUploading) return {};
      get().clearValidationError?.();
      if (state.dialogVisible) {
        get().clearFileState();
        get().clearSelectionMode();
      }
      return { dialogVisible: !state.dialogVisible };
    }),

  setError: (errorType: UploadErrorType, message = "", details = []) =>
    set({ errorType, errorMessage: message, errorDetails: details }),

  clearError: () =>
    set({ errorType: "none", errorMessage: "", errorDetails: [] }),

  setCreateAreaFn: (fn) => {
    set({ createAreaFn: fn });
  },

  handleFile: async (file: File) => {
    const { clearError } = get();

    clearError();

    if (
      !UPLOAD_DIALOG_FILE_TYPES.some((type) =>
        file.name.toLowerCase().endsWith(type)
      )
    ) {
      get().setError(
        "file-format-invalid",
        `Only ${UPLOAD_DIALOG_FILE_TYPES.join(", ")} files are supported`
      );
      set({
        selectedFile: null,
        filename: "",
        isFileSelected: false,
      });
      return;
    }

    const isBatch = isBatchUploadFile(file.name);
    const [maxSize, maxSizeMb] = isBatch
      ? [BATCH_UPLOAD_MAX_FILE_SIZE, BATCH_UPLOAD_MAX_FILE_SIZE_MB]
      : [MAX_FILE_SIZE, MAX_FILE_SIZE_MB];

    if (file.size > maxSize) {
      get().setError(
        "file-too-large",
        `File size exceeds ${maxSizeMb}MB limit`
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

    // CSV and shapefile contents are validated by the backend on upload.
    if (isBatch) {
      set({
        selectedFile: file,
        filename: file.name,
        isFileSelected: true,
        validatedGeoJson: null,
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

      const result = await createAreaFn(requestData);
      get().clearFileState();
      get().clearSelectionMode();
      set({ dialogVisible: false });
      return result;
    } catch (error) {
      console.error("Upload error:", error);
      setError("failed-to-send", "Failed to process file. Please try again.");
    } finally {
      set({ isUploading: false });
    }
  },

  uploadBatchFile: async () => {
    const { selectedFile, setError } = get();

    if (!selectedFile) {
      setError("file-empty", "No file selected");
      return;
    }

    set({ isUploading: true });

    try {
      const result = await uploadCustomAreasFile(selectedFile);
      get().clearFileState();
      get().clearSelectionMode();
      set({ dialogVisible: false });
      return result;
    } catch (error) {
      console.error("Upload error:", error);
      if (error instanceof AreaUploadError) {
        setError("failed-to-send", error.message, error.details);
      } else {
        setError("failed-to-send", "Failed to upload file. Please try again.");
      }
      // The file must be fixed before a retry, so go back to the drop zone,
      // which shows the errors.
      set({ selectedFile: null, filename: "", isFileSelected: false });
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
      errorDetails: [],
      isUploading: false,
      validatedGeoJson: null,
    });
  },
});
