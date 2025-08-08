import { create } from "zustand";
import { DrawAreaSlice, createDrawAreaSlice } from "./drawAreaSlice";
import { UploadAreaSlice, createUploadAreaSlice } from "./uploadAreaSlice";
import { MapSlice, createMapSlice } from "./mapSlice";

export type MapState = MapSlice & DrawAreaSlice & UploadAreaSlice;

const useMapStore = create<MapState>()((...a) => ({
  ...createMapSlice(...a),
  ...createDrawAreaSlice(...a),
  ...createUploadAreaSlice(...a),
}));

export default useMapStore;
