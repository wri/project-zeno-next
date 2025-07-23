import { TerraDraw, TerraDrawPolygonMode } from "terra-draw";
import { TerraDrawMapLibreGLAdapter } from "terra-draw-maplibre-gl-adapter";
import { StateCreator } from "zustand";
import type { Map } from "maplibre-gl";

export interface DrawAreaSlice {
  terraDraw: TerraDraw | null;
  isDrawingMode: boolean;
  setTerraDraw: (terraDraw: TerraDraw | null) => void;
  setDrawingMode: (isDrawing: boolean) => void;
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

  initializeTerraDraw: (map) => {
    const terraDraw = new TerraDraw({
      adapter: new TerraDrawMapLibreGLAdapter({ map }),
      modes: [new TerraDrawPolygonMode()],
    });

    set({ terraDraw });
  },
});
