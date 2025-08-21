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
  upsertContextByType: (item: Omit<ContextItem, "id">) => void;
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
      // Check if item with same contextType and content already exists
      const exists = state.context.some(
        (existingItem) =>
          existingItem.contextType === item.contextType &&
          JSON.stringify(existingItem.content) === JSON.stringify(item.content)
      );

      if (exists) {
        return state; // Don't add if it already exists
      }

      // If adding a dataset layer context, ensure the map layer is added
      if (
        item.contextType === "layer" &&
        typeof item.datasetId === "number" &&
        item.tileUrl
      ) {
        useMapStore.getState().addTileLayer({
          id: `dataset-${item.datasetId}`,
          name: item.layerName || String(item.datasetId),
          url: item.tileUrl,
          visible: true,
        });
      }

      return {
        context: [
          ...state.context,
          { ...item, id: `${item.contextType}-${Date.now()}` },
        ],
      };
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
  upsertContextByType: (item) =>
    set((state) => {
      const newContext = state.context.filter(
        (c) => c.contextType !== item.contextType
      );

      return {
        context: [
          ...newContext,
          { ...item, id: `${item.contextType}-${Date.now()}` },
        ],
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
