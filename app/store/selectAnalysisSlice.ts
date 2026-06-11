import { StateCreator } from "zustand";
import type { MapState } from "./mapStore";

export interface LngLat {
  lng: number;
  lat: number;
}

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
  /** Where to anchor the CTA popup (the clicked point). */
  lngLat: LngLat | null;
  setAnalysis: (selection: AnalysisSelection, lngLat: LngLat) => void;
  clearAnalysis: () => void;
}

/**
 * Ephemeral UI state for the analysis CTA — deliberately separate from the
 * chat-context store. Holds only the current selection + anchor.
 */
export const createSelectAnalysisSlice: StateCreator<
  MapState,
  [],
  [],
  SelectAnalysisSlice
> = (set) => ({
  analysisSelection: null,
  lngLat: null,
  setAnalysis: (selection, lngLat) =>
    set({ analysisSelection: selection, lngLat }),
  clearAnalysis: () => set({ analysisSelection: null, lngLat: null }),
});
