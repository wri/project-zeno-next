import { StateCreator } from "zustand";
import {
  AreaUploadError,
  uploadCustomAreasFile,
  validateAreaFile,
} from "@/src/entities/custom-area";
import type { UploadCustomAreasResponse } from "../schemas/api/custom_areas/upload";
import type { MapState } from "./mapStore";
import { generateRandomName } from "../utils/generateRandomName";
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
    get().clearError();

    const validation = await validateAreaFile(file);
    if (!validation.ok) {
      get().setError(validation.errorType, validation.errorMessage);
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
      // CSV and shapefile contents are validated by the backend on upload.
      validatedGeoJson:
        validation.kind === "geojson" ? validation.polygons : null,
    });
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
