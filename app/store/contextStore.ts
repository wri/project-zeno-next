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
  // For layer context, tie the context item to a map layer id
  mapLayerId?: string;
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
      // Check if item with same contextType and content already exists
      const exists = state.context.some(
        (existingItem) =>
          existingItem.contextType === item.contextType &&
          JSON.stringify(existingItem.content) === JSON.stringify(item.content)
      );

      if (exists) {
        return state; // Don't add if it already exists
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
      if (itemToRemove?.mapLayerId) {
        // Remove corresponding map layer if this context item represents a dataset layer
        useMapStore.getState().removeTileLayer(itemToRemove.mapLayerId);
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
        if (c.mapLayerId) removeTileLayer(c.mapLayerId);
      });
      return { context: [] };
    }),
  reset: () => set(initialState),
}));

export default useContextStore;
