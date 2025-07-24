import { StateCreator } from "zustand";
import {
  ACCEPTED_FILE_TYPES,
  MAX_FILE_SIZE,
  MAX_FILE_SIZE_MB,
} from "../constants/upload";
import type { MapState } from "./mapStore";
import { generateRandomName } from "../utils/generateRandomName";
import { AOI } from "../types/chat";

type UploadErrorType =
  | "none"
  | "file-too-large"
  | "file-empty"
  | "file-format-invalid"
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
  setError: (errorType: UploadErrorType, message?: string) => void;
  clearError: () => void;
  handleFile: (file: File) => void;
  uploadFile: () => Promise<void>;
  clearFileState: () => void;
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

  toggleUploadAreaDialog: () =>
    set((state) => {
      if (state.dialogVisible) {
        get().clearFileState();
      }
      return { dialogVisible: !state.dialogVisible };
    }),

  setError: (errorType: UploadErrorType, message = "") =>
    set({ errorType, errorMessage: message }),

  clearError: () => set({ errorType: "none", errorMessage: "" }),

  handleFile: (file: File) => {
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

    set({
      selectedFile: file,
      filename: file.name,
      isFileSelected: true,
      errorType: "none",
      errorMessage: "",
    });
  },

  uploadFile: async () => {
    const { selectedFile, setError } = get();

    if (!selectedFile) {
      setError("file-empty", "No file selected");
      return;
    }

    set({ isUploading: true });

    try {
      const fileContent = await selectedFile.text();
      let geoJsonData: GeoJSON.GeoJSON;

      try {
        geoJsonData = JSON.parse(fileContent);
      } catch {
        setError("file-format-invalid", "Invalid JSON format");
        return;
      }

      if (!geoJsonData || typeof geoJsonData !== "object") {
        setError("file-format-invalid", "Invalid GeoJSON format");
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
        setError(
          "file-format-invalid",
          "No valid Polygon or MultiPolygon features found"
        );
        return;
      }

      const newArea: AOI = {
        name: generateRandomName(),
        geometry: {
          type: "FeatureCollection",
          features: features,
        },
      };
      get().addCustomArea(newArea);

      // Reset state on successful upload
      get().clearFileState();
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
    });
  },
});
