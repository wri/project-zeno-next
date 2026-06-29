import { create } from "zustand";

// The full-height docked side panel: Areas, Analysis, or the Data Catalogue.
// null = closed. This is INDEPENDENT of the AI chat — opening a side panel
// never changes the chat, and vice versa.
export type SidePane = "areas" | "analysis" | "catalogue" | null;

// Shared bridge for the dashboards workspace:
// - @mention chips pushed from an insight card into the chat composer
// - the docked side panel (Areas / Analysis / Data Catalogue)
// - whether the AI chat is full-sized (docked, left of the side panel) or
//   floating — independent of the side panel
// - requesting focus of the chat input ("Ask AI")
interface ComposerState {
  mentions: string[];
  addMention: (title: string) => void;
  removeMention: (title: string) => void;
  clearMentions: () => void;

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
}

const useComposerStore = create<ComposerState>((set) => ({
  mentions: [],
  addMention: (title) =>
    set((s) =>
      s.mentions.includes(title) ? s : { mentions: [...s.mentions, title] }
    ),
  removeMention: (title) =>
    set((s) => ({ mentions: s.mentions.filter((m) => m !== title) })),
  clearMentions: () => set({ mentions: [] }),

  sidePane: null,
  openSidePane: (pane) => set({ sidePane: pane }),
  closeSidePane: () => set({ sidePane: null }),

  chatMaximised: false,
  setChatMaximised: (value) => set({ chatMaximised: value }),

  chatCollapsed: false,
  setChatCollapsed: (value) => set({ chatCollapsed: value }),

  focusNonce: 0,
  requestFocus: () => set((s) => ({ focusNonce: s.focusNonce + 1 })),
}));

export default useComposerStore;
