import { create } from "zustand";
import type { AreaSelection } from "./area-selection";

interface SelectionState {
  /** The area selected for analysis, or null when nothing is selected. */
  selection: AreaSelection | null;
  select: (selection: AreaSelection) => void;
  clear: () => void;
}

/**
 * Ephemeral UI state for the analysis nudge — deliberately separate from the
 * chat-context store (ADR 0007). Holds only the current selection; the
 * ViewAnalysisTrigger reacts to it to surface the in-chat "View Analysis" nudge.
 */
const useSelectionStore = create<SelectionState>((set) => ({
  selection: null,
  select: (selection) => set({ selection }),
  clear: () => set({ selection: null }),
}));

export default useSelectionStore;
