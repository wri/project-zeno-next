import { create } from "zustand";
import { ChatContextType } from "@/app/components/ContextButton";
import { AOI, UIContext } from "@/app/types/chat";
import bbox from "@turf/bbox";
import bboxPolygon from "@turf/bbox-polygon";

export interface ContextItem {
  id: string;
  contextType: ChatContextType;
  content: string | object;
}

export interface AOIContextItem extends ContextItem {
  contextType: "area";
  content: AOI;
}

interface ContextState {
  context: ContextItem[];
}

interface ContextActions {
  reset: () => void;
  addContext: (item: ContextItem) => void;
  removeContext: (id: string) => void;
  clearContext: () => void;
}

const initialState: ContextState = {
  context: [],
};

export function generateUIContext(context: ContextItem[]): UIContext {
  // for now simplify the geometry of the AOI to the bounds
  const aoi = context.find((c) => c.contextType === "area") as AOIContextItem;
  const bounds = bbox(aoi.content.geometry);
  const boundsPolygon = bboxPolygon(bounds);
  const simplifiedAOI = {
    name: aoi.content.name,
    geometry: {
      type: "FeatureCollection",
      features: [boundsPolygon],
    },
  } as AOI;

  return {
    aoi: simplifiedAOI,
  } as UIContext;
}

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
        context: [...state.context, { ...item }],
      };
    }),
  removeContext: (id) =>
    set((state) => ({
      context: state.context.filter((c) => c.id !== id),
    })),
  clearContext: () => set({ context: [] }),
  reset: () => set(initialState),
}));

export default useContextStore;
