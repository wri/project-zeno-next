import { create } from "zustand";
import type { AreaSelection } from "./area-selection";

export interface LngLat {
  lng: number;
  lat: number;
}

interface SelectionState {
  /** The area selected for analysis, or null when nothing is selected. */
  selection: AreaSelection | null;
  /** Where to anchor the CTA popup (the clicked point). */
  lngLat: LngLat | null;
  select: (selection: AreaSelection, lngLat: LngLat) => void;
  clear: () => void;
}

/**
 * Ephemeral UI state for the analysis CTA — deliberately separate from the
 * chat-context store (ADR 0007). Holds only the current selection + anchor.
 */
const useSelectionStore = create<SelectionState>((set) => ({
  selection: null,
  lngLat: null,
  select: (selection, lngLat) => set({ selection, lngLat }),
  clear: () => set({ selection: null, lngLat: null }),
}));

export default useSelectionStore;
