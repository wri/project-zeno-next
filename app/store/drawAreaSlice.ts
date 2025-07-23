import { TerraDraw, TerraDrawPolygonMode } from "terra-draw";
import { TerraDrawMapLibreGLAdapter } from "terra-draw-maplibre-gl-adapter";
import { StateCreator } from "zustand";
import type { Map } from "maplibre-gl";

export interface DrawAreaSlice {
  terraDraw: TerraDraw | null;
  isDrawingMode: boolean;
  startDrawing: () => void;
  confirmDrawing: () => void;
  cancelDrawing: () => void;
  initializeTerraDraw: (map: Map) => void;
}

// This ensures TerraDraw is initialized before use
function getTerraDraw(get: () => DrawAreaSlice) {
  const { terraDraw } = get();
  if (!terraDraw) {
    throw new Error("TerraDraw not initialized");
  }
  return terraDraw;
}

export const createDrawAreaSlice: StateCreator<
  DrawAreaSlice,
  [],
  [],
  DrawAreaSlice
> = (set, get) => ({
  terraDraw: null,
  isDrawingMode: false,

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

    set({ isDrawingMode: true });
  },

  confirmDrawing: () => {
    getTerraDraw(get).stop();
    set({ isDrawingMode: false });
  },

  cancelDrawing: () => {
    getTerraDraw(get).stop();
    set({ isDrawingMode: false });
  },
});
