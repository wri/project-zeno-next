import { create } from "zustand";
import { ChatContextType } from "@/app/components/ContextButton";
import useMapStore from "./mapStore";

export interface ContextItem {
  id: string;
  contextType: ChatContextType;
  content: string | object;
  // For AOI context, store additional details needed for ui_context
  aoiData?: {
    name: string;
    gadm_id?: string;
    src_id?: string;
    subtype?: string;
    source?: string;
  };
  dateRange?: {
    start: Date;
    end: Date;
  };
  // For dataset context, store the dataset id (used in ui_context and to derive map layer ids)
  datasetId?: number;
  // Optional display properties for map layers
  tileUrl?: string;
  layerName?: string;
}

interface ContextState {
  context: ContextItem[];
}

interface ContextActions {
  reset: () => void;
  addContext: (item: Omit<ContextItem, "id">) => void;
  removeContext: (id: string) => void;
  clearContext: () => void;
}

const initialState: ContextState = {
  context: [],
};

const useContextStore = create<ContextState & ContextActions>((set) => ({
  ...initialState,
    addContext: (item) =>
    set((state) => {
      let newContext = [...state.context];

      // If adding a layer, remove all other layers first
      if (item.contextType === "layer") {
        const existingLayers = newContext.filter(
          (c) => c.contextType === "layer"
        );
        const { removeTileLayer } = useMapStore.getState();
        existingLayers.forEach((layer) => {
          if (typeof layer.datasetId === "number") {
            removeTileLayer(`dataset-${layer.datasetId}`);
          }
        });
        newContext = newContext.filter((c) => c.contextType !== "layer");
      }

      // Check for duplicates for non-layer context types
      const exists = newContext.some(
        (existingItem) =>
          existingItem.contextType === item.contextType &&
          JSON.stringify(existingItem.content) === JSON.stringify(item.content)
      );

      if (exists) {
        return { context: newContext };
      }

      // Add the new item
      const newItem = { ...item, id: `${item.contextType}-${Date.now()}` };
      newContext.push(newItem);

      // If it's a layer, add it to the map
      if (
        newItem.contextType === "layer" &&
        typeof newItem.datasetId === "number" &&
        newItem.tileUrl
      ) {
        useMapStore.getState().addTileLayer({
          id: `dataset-${newItem.datasetId}`,
          name: newItem.layerName || String(newItem.datasetId),
          url: newItem.tileUrl,
          visible: true,
        });
      }

      return { context: newContext };
    }),
  removeContext: (id) =>
    set((state) => {
      const itemToRemove = state.context.find((c) => c.id === id);
      if (typeof itemToRemove?.datasetId === "number") {
        // Remove corresponding map layer if this context item represents a dataset layer
        useMapStore
          .getState()
          .removeTileLayer(`dataset-${itemToRemove.datasetId}`);
      }
      return {
        context: state.context.filter((c) => c.id !== id),
      };
    }),
  clearContext: () =>
    set((state) => {
      // Remove any map layers tied to context entries before clearing
      const { removeTileLayer } = useMapStore.getState();
      state.context.forEach((c) => {
        if (typeof c.datasetId === "number")
          removeTileLayer(`dataset-${c.datasetId}`);
      });
      return { context: [] };
    }),
  reset: () => set(initialState),
}));

export default useContextStore;
