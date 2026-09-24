import { StateCreator } from "zustand";
import type { MapState } from "./mapStore";

/**
 * Visibility of the map's upload dialog. The upload itself (validation,
 * requests, errors) lives in `@/src/features/area-upload`, shared with the
 * dashboard entry point.
 */
export interface UploadAreaSlice {
  dialogVisible: boolean;
  toggleUploadAreaDialog: () => void;
}

export const createUploadAreaSlice: StateCreator<
  MapState,
  [],
  [],
  UploadAreaSlice
> = (set, get) => ({
  dialogVisible: false,

  toggleUploadAreaDialog: () =>
    set((state) => {
      get().clearValidationError?.();
      if (state.dialogVisible) get().clearSelectionMode();
      return { dialogVisible: !state.dialogVisible };
    }),
});
