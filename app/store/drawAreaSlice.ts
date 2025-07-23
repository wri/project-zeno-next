import { TerraDraw } from "terra-draw";
import { StateCreator } from "zustand";

export interface DrawAreaSlice {
  terraDraw: TerraDraw | null;
  isDrawingMode: boolean;
  setTerraDraw: (terraDraw: TerraDraw | null) => void;
  setDrawingMode: (isDrawing: boolean) => void;
}

export const createDrawAreaSlice: StateCreator<
  DrawAreaSlice,
  [],
  [],
  DrawAreaSlice
> = (set, get) => ({
  terraDraw: null,
  isDrawingMode: false,

  setTerraDraw: (terraDraw) => {
    set({ terraDraw });
  },

  setDrawingMode: (isDrawing) => {
    const { terraDraw } = get();
    if (!terraDraw) return;

    if (isDrawing) {
      terraDraw.start();
    } else {
      terraDraw.stop();
    }
    set({ isDrawingMode: isDrawing });
  },
});
