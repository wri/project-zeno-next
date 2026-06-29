import { create } from "zustand";

// Open/closed state for the map's left-docked Analyses pane (the list view of
// analyses, complementing the right-side InsightWorkspace chart detail). Kept
// in its own tiny store so the composer toolbar trigger and the pane itself can
// share it without coupling to chat or map state.
interface AnalysesPaneState {
  open: boolean;
  openPane: () => void;
  closePane: () => void;
  togglePane: () => void;
}

const useAnalysesPaneStore = create<AnalysesPaneState>((set) => ({
  open: false,
  openPane: () => set({ open: true }),
  closePane: () => set({ open: false }),
  togglePane: () => set((s) => ({ open: !s.open })),
}));

export default useAnalysesPaneStore;
