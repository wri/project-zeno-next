import { StateCreator } from "zustand";
import { FeatureCollection, Feature } from "geojson";
import type { AOISelection } from "@/app/types/chat";
import type { MapState } from "./mapStore";


export interface FeatureRef {
  name: string;
  source: string;
}

export interface GeoJsonEntry {
  ref: FeatureRef;
  data: FeatureCollection | Feature;
}

export type LayerType = "raster" | "geojson";

export interface Layer {
  id: string;
  name: string;
  type: LayerType;
  visible: boolean;
  opacity?: number;
  tileUrl?: string;
  featureRefs?: FeatureRef[];
  selectionName?: string;
  aoiSelection?: AOISelection;
  datasetId?: number;
}

export interface LayerManagerSlice {
  layers: Layer[];
  geoJsonRegistry: GeoJsonEntry[];

  addLayer: (layer: Layer) => void;
  removeLayer: (id: string) => void;
  setLayerVisibility: (id: string, visible: boolean) => void;
  setLayerOpacity: (id: string, opacity: number) => void;
  reorderLayers: (ids: string[]) => void;
  addToRegistry: (entry: GeoJsonEntry) => void;
  removeFromRegistry: (ref: FeatureRef) => void;
}

export const createLayerManagerSlice: StateCreator<
MapState, [], [], LayerManagerSlice>
= (set, get) => ({
  layers: [],
  geoJsonRegistry: [],

  addLayer: (layer) => {
    const newLayer = { ...layer, opacity: layer.opacity ?? 1 };
    set((state) => ({ 
      layers: [...state.layers.filter((l) => l.id !== layer.id), newLayer]
    }));
  },
  removeLayer: (id) => {
    set((state) => ({
      layers: state.layers.filter((l) => l.id !== id),
    }));
  },
  setLayerVisibility: (id, visible) => {
    set((state) => ({
      layers: state.layers.map((l) => l.id === id ? { ...l, visible } : l)
    }));
  },
  setLayerOpacity: (id, opacity) => {
    set((state) => ({
      layers: state.layers.map((l) => l.id === id ? { ...l, opacity } : l)
    }));
  },
  reorderLayers: (ids) => {
    set((state) => ({
      layers: ids
        .map((id) => state.layers.find((l) => l.id === id))
        .filter((l): l is Layer => !!l),
    }));
  },
  addToRegistry: (entry) => {
    set((state) => ({
      geoJsonRegistry: [
        ...state.geoJsonRegistry.filter(
          (e) => !(e.ref.name === entry.ref.name && e.ref.source === entry.ref.source)
        ),
        entry,
      ],
    }));
  },
  removeFromRegistry: (ref) => {
    set((state) => ({
      geoJsonRegistry: state.geoJsonRegistry.filter(
        (e) => !(e.ref.name === ref.name && e.ref.source === ref.source)
      ),
    }));
  },
});