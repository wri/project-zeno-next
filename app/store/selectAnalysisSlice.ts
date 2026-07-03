import { StateCreator } from "zustand";
import type { MapState } from "./mapStore";

export interface AnalysisSelection {
  name: string;
  source: string;
  // Undefined is possible: the source feature may not carry an id/subtype.
  srcId?: string;
  subtype?: string;
}

export interface SelectAnalysisSlice {
  /** The area selected for analysis, or null when nothing is selected. */
  analysisSelection: AnalysisSelection | null;
  setAnalysis: (selection: AnalysisSelection) => void;
  clearAnalysis: () => void;
}

/**
 * Ephemeral UI state for the analysis CTA — deliberately separate from the
 * chat-context store. Holds only the current selection (one at a time).
 */
export const createSelectAnalysisSlice: StateCreator<
  MapState,
  [],
  [],
  SelectAnalysisSlice
> = (set) => ({
  analysisSelection: null,
  setAnalysis: (selection) => set({ analysisSelection: selection }),
  clearAnalysis: () => set({ analysisSelection: null }),
});
