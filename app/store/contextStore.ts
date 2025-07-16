import { create } from "zustand";
import { ChatContextType } from "@/app/components/ContextButton";

export interface ContextItem {
  id: string;
  contextType: ChatContextType;
  content: string;
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
    set((state) => ({
      context: [
        ...state.context,
        { ...item, id: `${item.contextType}-${Date.now()}` },
      ],
    })),
  removeContext: (id) =>
    set((state) => ({
      context: state.context.filter((c) => c.id !== id),
    })),
  clearContext: () => set({ context: [] }),
  reset: () => set(initialState),
}));

export default useContextStore;
