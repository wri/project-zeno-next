import { create } from "zustand";
import { ChatContextType } from "@/app/components/ContextButton";
import useMapStore from "./mapStore";
import type { AOISelection } from "@/app/types/chat";

export interface ContextItem {
  id: string;
  contextType: ChatContextType;
  // Flag to indicate if this context is part of the ai state.
  isAiContext?: boolean;
  content: string | object;
  // For AOI context, store additional details needed for ui_context
  aoiData?: {
    name: string;
    gadm_id?: string;
    src_id?: string;
    subtype?: string;
    source?: string;
  };
  // For multi-AOI context, store the full selection (name + list of AOIs)
  aoiSelection?: AOISelection;
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
  markAsAiContext: (ids: string[]) => void;
  clearContext: () => void;
}

const initialState: ContextState = {
  context: [],
};

const useContextStore = create<ContextState & ContextActions>((set, get) => ({
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
        useMapStore.getState().addLayer({
          id: `dataset-${item.datasetId}`,
          name: item.layerName || String(item.datasetId),
          type: "raster",
          visible: true,
          tileUrl: item.tileUrl,
          datasetId: item.datasetId,
        });
      }

      return {
        context: [
          ...state.context,
          {
            ...item,
            isAiContext: item.isAiContext ?? false,
            id: `${item.contextType}-${Date.now()}`,
          },
        ],
      };
    }),
  removeContext: (id) =>
    set((state) => {
      const itemToRemove = state.context.find((c) => c.id === id);
      if (typeof itemToRemove?.datasetId === "number") {
        // Remove corresponding map layer if this context item represents a dataset layer
        useMapStore.getState().removeLayer(`dataset-${itemToRemove.datasetId}`);
      }
      return {
        context: state.context.filter((c) => c.id !== id),
      };
    }),
  upsertContextByType: (item) => {
    const state = get();
    // Remove contexts with the same type.
    state.context
      .filter((c) => c.contextType === item.contextType)
      .forEach((c) => state.removeContext(c.id));

    state.addContext(item);
  },
  markAsAiContext: (ids) =>
    set((state) => ({
      context: state.context.map((c) =>
        ids.includes(c.id) ? { ...c, isAiContext: true } : c
      ),
    })),
  clearContext: () =>
    set((state) => {
      // Remove any map layers tied to context entries before clearing
      const { removeLayer } = useMapStore.getState();
      state.context.forEach((c) => {
        if (typeof c.datasetId === "number")
          removeLayer(`dataset-${c.datasetId}`);
      });
      return { context: [] };
    }),
  reset: () => set(initialState),
}));

export default useContextStore;
