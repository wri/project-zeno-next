import { create } from "zustand";

/**
 * Ambient view state reported to the backend with every chat request
 * (`ChatRequest.view_context`). Unlike `ui_context` (deliberate user
 * actions), this is reference material: the backend renders a per-turn scope
 * line from `page` (+ dashboard fields) and tools like `add_to_dashboard`
 * default from it, but it is never merged into the agent's selections (see
 * project-zeno docs/view-context-pages.md).
 *
 * Each chat surface sets its context on mount and does NOT clear it on
 * unmount: effect ordering across a route transition is not guaranteed, so a
 * departing page's cleanup could wipe the value the arriving page just set.
 * A stale value can therefore only be read by a surface that failed to set
 * its own on mount.
 */
export type ViewContext =
  | {
      page: "map";
      // Live map extent + on-map insights aren't tracked here reactively —
      // they're computed fresh at send time (see enrichMapViewContext) the
      // same way `ui_context` is, so this store only ever holds `page`.
      viewport?: { bbox: [number, number, number, number]; zoom: number };
      visible_insights?: string[];
    }
  | { page: "dashboard"; dashboard_id: string; dashboard_name?: string };

interface ViewContextState {
  viewContext: ViewContext | null;
  setViewContext: (viewContext: ViewContext) => void;
}

const useViewContextStore = create<ViewContextState>((set) => ({
  viewContext: null,
  setViewContext: (viewContext) => set({ viewContext }),
}));

export default useViewContextStore;
