import { StateCreator } from "zustand";
import { FeatureCollection, Feature } from "geojson";
import type { AOISelection, ImageryInfo } from "@/app/types/chat";
import type { VectorStyleSpec } from "@/app/constants/datasets";
import type { MapState } from "./mapStore";
import type {
  CaptureStatus,
  Scene,
  Sentinel2Request,
} from "@/src/features/imagery";

export interface FeatureRef {
  name: string;
  source: string;
  // Part of the identity: names are display labels and repeat across
  // concession parcels (RSPO parcels share a company, unnamed ones fall back
  // to "Mining concession, IDN") and across saved custom areas. Every area
  // that reaches the map carries one: agent-picked areas their `src_id`, saved
  // custom areas (drawn and uploaded ones are saved first) their id.
  srcId?: string;
}

export interface GeoJsonEntry {
  ref: FeatureRef;
  data: FeatureCollection | Feature;
  srcId?: string;
  subtype?: string;
}

/**
 * Whether two refs name the same area: exact name, source and src id (refs
 * and entries are created from the same objects at registration time, so an
 * id-less ref only ever matches an id-less entry).
 */
export const sameFeatureRef = (a: FeatureRef, b: FeatureRef): boolean =>
  a.name === b.name && a.source === b.source && a.srcId === b.srcId;

/** The ref an agent-picked or card AOI is registered under. */
export const aoiFeatureRef = (aoi: {
  name: string;
  source: string;
  src_id?: string;
}): FeatureRef => ({ name: aoi.name, source: aoi.source, srcId: aoi.src_id });

/** The ref a saved custom area is registered under, wherever it is added. */
export const customAreaRef = (area: {
  id: string;
  name: string;
}): FeatureRef => ({
  name: area.name,
  source: "custom",
  srcId: area.id,
});

/** Look up a registry entry by its feature ref (see `sameFeatureRef`). */
export const findRegistryEntry = (
  registry: GeoJsonEntry[],
  ref: FeatureRef
): GeoJsonEntry | undefined => registry.find((e) => sameFeatureRef(e.ref, ref));

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
  // Raster source tuning, derived from a mosaic's TileJSON. Without the zoom
  // range MapLibre would request tiles outside the mosaic's range and get
  // 404s instead of overscaling.
  minzoom?: number;
  maxzoom?: number;
  bounds?: [number, number, number, number];
  attribution?: string;
  // Set when added from show_imagery (Sentinel-2 mosaic legend metadata)
  imagery?: ImageryInfo;
  // Set on a client-rendered Sentinel-2 capture (no tileUrl): the request it
  // shows, its scene search state and the scenes deck.gl draws.
  sentinel2?: Sentinel2LayerState;
}

export interface Sentinel2LayerState {
  request: Sentinel2Request;
  status: CaptureStatus;
  scenes: Scene[];
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
  /**
   * Remove a layer and the registry entries only it still references.
   * Entries are shared by ref across layers (an agent pick and the same area
   * from My areas, or "Brazil" and "Brazil and Peru"), so deleting them all
   * would blank the other layer. The cleanup is scoped to the removed layer's
   * own `featureRefs` and must never become a global sweep: `pickAoi.ts`
   * (`fetchAndRegisterAoi`) registers entries before `addLayer` runs.
   */
  removeLayer: (id: string) => void;
  /**
   * Remove a dataset's layers (main + context sub-layers). Pass a `datasetId`
   * to remove just that dataset, or omit it to clear all dataset layers
   * (single-select "replace" behaviour). Non-dataset layers are untouched.
   */
  removeDatasetLayers: (datasetId?: number) => void;
  setLayerVisibility: (id: string, visible: boolean) => void;
  setLayerOpacity: (id: string, opacity: number) => void;
  /** Patch fields of a layer in place, keeping its position. No-op for an unknown id. */
  updateLayer: (id: string, patch: Partial<Omit<Layer, "id">>) => void;
  reorderLayers: (ids: string[]) => void;
  addToRegistry: (entry: GeoJsonEntry) => void;
}

export const createLayerManagerSlice: StateCreator<
  MapState,
  [],
  [],
  LayerManagerSlice
> = (set, get) => ({
  layers: [],
  geoJsonRegistry: [],

  addLayer: (layer) => {
    const newLayer = { ...layer, opacity: layer.opacity ?? 1 };
    set((state) => ({
      layers: [...state.layers.filter((l) => l.id !== layer.id), newLayer],
    }));
    void import("@/app/store/chatStore").then(({ default: useChatStore }) => {
      useChatStore.getState().includeLayerInContext(layer.id);
    });
  },
  removeLayer: (id) => {
    set((state) => {
      const removed = state.layers.find((l) => l.id === id);
      const layers = state.layers.filter((l) => l.id !== id);
      const removedRefs = removed?.featureRefs ?? [];
      if (removedRefs.length === 0) return { layers };
      const stillUsed = layers.flatMap((l) => l.featureRefs ?? []);
      return {
        layers,
        geoJsonRegistry: state.geoJsonRegistry.filter(
          (e) =>
            !removedRefs.some((r) => sameFeatureRef(r, e.ref)) ||
            stillUsed.some((r) => sameFeatureRef(r, e.ref))
        ),
      };
    });
    void import("@/app/store/chatStore").then(({ default: useChatStore }) => {
      useChatStore.getState().includeLayerInContext(id);
    });
  },
  removeDatasetLayers: (datasetId) => {
    const removedIds = get()
      .layers.filter((l) => {
        if (typeof l.datasetId !== "number") return false;
        return datasetId === undefined ? true : l.datasetId === datasetId;
      })
      .map((l) => l.id);
    set((state) => ({
      layers: state.layers.filter((l) => {
        if (typeof l.datasetId !== "number") return true;
        return datasetId === undefined ? false : l.datasetId !== datasetId;
      }),
    }));
    if (removedIds.length > 0) {
      void import("@/app/store/chatStore").then(({ default: useChatStore }) => {
        const { includeLayerInContext } = useChatStore.getState();
        removedIds.forEach(includeLayerInContext);
      });
    }
  },
  setLayerVisibility: (id, visible) => get().updateLayer(id, { visible }),
  setLayerOpacity: (id, opacity) => get().updateLayer(id, { opacity }),
  updateLayer: (id, patch) => {
    set((state) => ({
      layers: state.layers.map((l) => (l.id === id ? { ...l, ...patch } : l)),
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
          (e) => !sameFeatureRef(e.ref, entry.ref)
        ),
        entry,
      ],
    }));
  },
});
