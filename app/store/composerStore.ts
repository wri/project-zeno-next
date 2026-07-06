import { create } from "zustand";

// UI state bridge for the dashboards workspace:
// - the docked side panel (the Analyses/insights picker or the data catalog)
// - whether the AI chat is full-sized (docked) or floating — independent of
//   the side panel
// - the floating chat collapsed to just its header bar
// - requesting focus of the chat input ("Ask AI")
export type SidePane = "insights" | "datasets" | null;

interface ComposerState {
  // Docked side panel — independent of the chat.
  sidePane: SidePane;
  openSidePane: (pane: Exclude<SidePane, null>) => void;
  closeSidePane: () => void;

  // AI chat full-sized (docked) vs floating — independent of the side panel.
  chatMaximised: boolean;
  setChatMaximised: (value: boolean) => void;

  // Floating chat collapsed to just its header bar (caret in the header).
  chatCollapsed: boolean;
  setChatCollapsed: (value: boolean) => void;

  // Bumped to ask the chat panel to focus its input.
  focusNonce: number;
  requestFocus: () => void;

  reset: () => void;
}

const useComposerStore = create<ComposerState>((set) => ({
  sidePane: null,
  openSidePane: (pane) => set({ sidePane: pane }),
  closeSidePane: () => set({ sidePane: null }),

  chatMaximised: false,
  setChatMaximised: (value) => set({ chatMaximised: value }),

  chatCollapsed: false,
  setChatCollapsed: (value) => set({ chatCollapsed: value }),

  focusNonce: 0,
  requestFocus: () => set((s) => ({ focusNonce: s.focusNonce + 1 })),

  reset: () =>
    set({
      sidePane: null,
      chatMaximised: false,
      chatCollapsed: false,
    }),
}));

export default useComposerStore;
