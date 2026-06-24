import { create } from "zustand";

// Shared bridge between the right-hand dashboard content and the left dock:
// - @mention chips pushed from an insight card into the chat composer
// - opening/closing the slide-out Analyses panel from anywhere
// - requesting focus of the chat input ("Ask AI")
interface ComposerState {
  mentions: string[];
  addMention: (title: string) => void;
  removeMention: (title: string) => void;
  clearMentions: () => void;

  analysesOpen: boolean;
  openAnalyses: () => void;
  closeAnalyses: () => void;

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

  focusNonce: 0,
  // Focusing the chat only makes sense when it's visible, so also close the
  // Analyses panel (which otherwise covers the composer).
  requestFocus: () =>
    set((s) => ({ focusNonce: s.focusNonce + 1, analysesOpen: false })),
}));

export default useComposerStore;
