import { create } from "zustand";

export type PanelState = "minimized" | "chat" | "dataset" | "threads";

interface ExplorePanelState {
  panelState: PanelState;
  previousState: PanelState | null;
  activeInsightId: string | null;
}

interface ExplorePanelActions {
  setPanelState: (state: PanelState) => void;
  openChat: () => void;
  openDataset: () => void;
  openThreads: () => void;
  closePanel: () => void;
  goBack: () => void;
  setActiveInsight: (id: string | null) => void;
}

const useExplorePanelStore = create<ExplorePanelState & ExplorePanelActions>(
  (set, get) => ({
    panelState: "minimized",
    previousState: null,
    activeInsightId: null,

    setPanelState: (panelState) => set({ panelState }),

    openChat: () =>
      set({ panelState: "chat", previousState: get().panelState }),

    openDataset: () =>
      set({ panelState: "dataset", previousState: get().panelState }),

    openThreads: () =>
      set({ panelState: "threads", previousState: get().panelState }),

    closePanel: () => set({ panelState: "minimized", previousState: null }),

    goBack: () => {
      const { previousState } = get();
      set({
        panelState: previousState === "minimized" || !previousState
          ? "chat"
          : previousState,
        previousState: null,
      });
    },

    setActiveInsight: (id) => set({ activeInsightId: id }),
  })
);

export default useExplorePanelStore;
