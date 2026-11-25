import { create } from "zustand";
import {
  encodeRecipe,
  type SceneSearchResult,
  type Sentinel2Request,
} from "@/src/features/imagery";
import { showSentinel2Capture } from "./sentinel2Captures";

type Bounds = [number, number, number, number];

/**
 * The imagery focus editor: a full-screen mode where the user edits one
 * Sentinel-2 capture and sees the search results as scene cards. While it is
 * open, the other panels hide and the map shows only the draft's scenes.
 * Closing it applies the draft as the live capture (if it changed).
 */
interface ImageryFocusState {
  /** The request the editor opened with; null when the editor is closed. */
  original: Sentinel2Request | null;
  /** The request being edited. */
  draft: Sentinel2Request | null;
  /** The area's bounds (lon/lat), once known: framing and thumbnail crops. */
  bounds: Bounds | null;
  /** The newest search result and the draft it is for. */
  searched: { key: string; result: SceneSearchResult } | null;
  /** The scene card under the pointer: its footprint shows on the map. */
  hoveredSceneId: string | null;

  open: (request: Sentinel2Request, bounds?: Bounds) => void;
  updateDraft: (patch: Partial<Sentinel2Request>) => void;
  resetDraft: () => void;
  setSearched: (
    request: Sentinel2Request,
    result: SceneSearchResult,
    bounds: Bounds
  ) => void;
  setHoveredScene: (id: string | null) => void;
  /** Close the editor. `apply` (default) makes the draft the live capture. */
  close: (options?: { apply?: boolean }) => void;
}

const useImageryFocusStore = create<ImageryFocusState>((set, get) => ({
  original: null,
  draft: null,
  bounds: null,
  searched: null,
  hoveredSceneId: null,

  open: (request, bounds) =>
    set({
      original: request,
      draft: request,
      bounds: bounds ?? null,
      searched: null,
      hoveredSceneId: null,
    }),

  updateDraft: (patch) =>
    set((state) =>
      state.draft ? { draft: { ...state.draft, ...patch } } : state
    ),

  resetDraft: () => set((state) => ({ draft: state.original })),

  setSearched: (request, result, bounds) =>
    set({ searched: { key: encodeRecipe(request), result }, bounds }),

  setHoveredScene: (id) => set({ hoveredSceneId: id }),

  close: ({ apply = true } = {}) => {
    const { original, draft } = get();
    set({
      original: null,
      draft: null,
      searched: null,
      hoveredSceneId: null,
    });
    if (
      apply &&
      original &&
      draft &&
      encodeRecipe(draft) !== encodeRecipe(original)
    ) {
      void showSentinel2Capture(draft);
    }
  },
}));

/** True while the imagery focus editor is open. */
export const useImageryFocusActive = () =>
  useImageryFocusStore((s) => s.original !== null);

export default useImageryFocusStore;
