import { create } from "zustand";

// Which context pane is docked beside the chat in the new-dashboard "setup"
// flow. null = no setup pane (the dock shows just the chat, with Analyses
// available as a slide-over). "areas" before an AOI is chosen, "analyses" once
// it has been — driven by the detail page from the dashboard's AOI state.
export type SetupPane = "areas" | "analyses" | null;

// Shared bridge between the right-hand dashboard content and the left dock:
// - @mention chips pushed from an insight card into the chat composer
// - opening/closing the slide-out Analyses panel from anywhere
// - the double-pane "setup" dock for a freshly created dashboard
// - requesting focus of the chat input ("Ask AI")
interface ComposerState {
  mentions: string[];
  addMention: (title: string) => void;
  removeMention: (title: string) => void;
  clearMentions: () => void;

  analysesOpen: boolean;
  openAnalyses: () => void;
  closeAnalyses: () => void;

  // Which context pane (Areas/Analyses) the chat is currently pointed at. Drives
  // the right-hand pane when the floating chat is maximised, and the intro copy.
  setupPane: SetupPane;
  openSetupPane: (pane: Exclude<SetupPane, null>) => void;
  closeSetupPane: () => void;

  // Whether the floating chat is maximised into the double pane (chat + context
  // side by side). Opening Areas/Analyses no longer forces this — it's an
  // explicit toggle, and the double pane is a larger floating card, not a
  // full-screen takeover.
  chatMaximised: boolean;
  setChatMaximised: (value: boolean) => void;

  // Bumped to ask the chat panel to focus its input (also reveals chat).
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

  analysesOpen: false,
  openAnalyses: () => set({ analysesOpen: true }),
  closeAnalyses: () => set({ analysesOpen: false }),

  setupPane: null,
  openSetupPane: (pane) => set({ setupPane: pane, analysesOpen: false }),
  closeSetupPane: () => set({ setupPane: null }),

  chatMaximised: false,
  setChatMaximised: (value) => set({ chatMaximised: value }),

  focusNonce: 0,
  // Focusing the chat only makes sense when it's visible, so also close the
  // Analyses panel (which otherwise covers the composer).
  requestFocus: () =>
    set((s) => ({ focusNonce: s.focusNonce + 1, analysesOpen: false })),
}));

export default useComposerStore;
