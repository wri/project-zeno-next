import { TerraDraw, TerraDrawPolygonMode } from "terra-draw";
import { TerraDrawMapLibreGLAdapter } from "terra-draw-maplibre-gl-adapter";
import { StateCreator } from "zustand";
import type { Map } from "maplibre-gl";

export interface DrawAreaSlice {
  terraDraw: TerraDraw | null;
  isDrawingMode: boolean;
  setTerraDraw: (terraDraw: TerraDraw | null) => void;
  startDrawing: () => void;
  confirmDrawing: () => void;
  cancelDrawing: () => void;
  initializeTerraDraw: (map: Map) => void;
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

  startDrawing: () => {
    const { terraDraw } = get();
    if (!terraDraw) return;
    terraDraw.start();
    set({ isDrawingMode: true });
  },

  confirmDrawing: () => {
    const { terraDraw } = get();
    if (!terraDraw) return;
    terraDraw.stop();
    set({ isDrawingMode: false });
  },

  cancelDrawing: () => {
    const { terraDraw } = get();
    if (!terraDraw) return;
    terraDraw.stop();
    set({ isDrawingMode: false });
  },

  initializeTerraDraw: (map) => {
    const terraDraw = new TerraDraw({
      adapter: new TerraDrawMapLibreGLAdapter({ map }),
      modes: [new TerraDrawPolygonMode()],
    });

    set({ terraDraw });
  },
});
