import { StateCreator } from "zustand";
import {
  ACCEPTED_FILE_TYPES,
  MAX_FILE_SIZE,
  MAX_FILE_SIZE_MB,
} from "../constants/upload";
import type { MapState } from "./mapStore";

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
      // TODO: Implement actual file upload logic here
      // For now, simulate upload delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Reset state on successful upload
      get().clearFileState();
      set({ dialogVisible: false });
    } catch {
      setError("failed-to-send", "Failed to upload file. Please try again.");
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