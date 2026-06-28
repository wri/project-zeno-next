import { StateCreator } from "zustand";
import { FeatureCollection, Feature } from "geojson";
import type { AOISelection } from "@/app/types/chat";
import type { VectorStyleSpec } from "@/app/constants/datasets";
import type { MapState } from "./mapStore";

export interface FeatureRef {
  name: string;
  source: string;
}

export interface GeoJsonEntry {
  ref: FeatureRef;
  data: FeatureCollection | Feature;
  srcId?: string;
  subtype?: string;
}

export type LayerType = "raster" | "geojson" | "vector";

export interface Layer {
  id: string;
  name: string;
  type: LayerType;
  visible: boolean;
  opacity?: number;
  tileUrl?: string;
  sourceLayer?: string;
  featureRefs?: FeatureRef[];
  selectionName?: string;
  aoiSelection?: AOISelection;
  datasetId?: number;
  // Runtime metadata for legend display (set when added from pick_dataset)
  parameters?: Record<string, unknown>;
  startDate?: string;
  endDate?: string;
  // Set on a context-layer sub-layer to mark it as a child of `parentLayerId`
  parentLayerId?: string;
  // Data-driven fill/line paint spec for type:"vector" context layers
  vectorStyle?: VectorStyleSpec;
}

// The two MVT renderers partition vector layers by whether they carry a
// data-driven `vectorStyle`. Mutually exclusive by construction:
//  - styled vectors → VectorDataLayers   (context/dataset fills)
//  - AOI vectors    → AoiVectorTileLayers (boundary selection styling)
export const isStyledVectorLayer = (
  l: Layer
): l is Layer & {
  tileUrl: string;
  sourceLayer: string;
  vectorStyle: VectorStyleSpec;
} => l.type === "vector" && !!l.tileUrl && !!l.sourceLayer && !!l.vectorStyle;

export const isAoiVectorLayer = (
  l: Layer
): l is Layer & { tileUrl: string; sourceLayer: string } =>
  l.type === "vector" && !!l.tileUrl && !!l.sourceLayer && !l.vectorStyle;

// A layer that represents an area selection (AOI) — the query scope.
// Two shapes qualify:
//  - geojson layers (single/multi area selections carry `featureRefs`)
//  - AOI vector-tile layers (the "all countries" global layer; styled
//    dataset vectors are excluded by `isAoiVectorLayer`'s !vectorStyle guard)
// Dataset layers (raster main + styled vector sub-layers) never match.
export const isAreaLayer = (l: Layer): boolean =>
  l.type === "geojson" || isAoiVectorLayer(l);

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
  MapState,
  [],
  [],
  LayerManagerSlice
> =
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  (set, get) => ({
    layers: [],
    geoJsonRegistry: [],

    addLayer: (layer) => {
      const newLayer = { ...layer, opacity: layer.opacity ?? 1 };
      set((state) => ({
        layers: [...state.layers.filter((l) => l.id !== layer.id), newLayer],
      }));
    },
    removeLayer: (id) => {
      set((state) => ({
        layers: state.layers.filter((l) => l.id !== id),
      }));
    },
    setLayerVisibility: (id, visible) => {
      set((state) => ({
        layers: state.layers.map((l) => (l.id === id ? { ...l, visible } : l)),
      }));
    },
    setLayerOpacity: (id, opacity) => {
      set((state) => ({
        layers: state.layers.map((l) => (l.id === id ? { ...l, opacity } : l)),
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
            (e) =>
              !(
                e.ref.name === entry.ref.name &&
                e.ref.source === entry.ref.source
              )
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
