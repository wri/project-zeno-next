import { create } from "zustand";
import { InsightWidget } from "@/app/types/chat";

export interface InsightState {
  insights: InsightWidget[];
  pendingBatch: InsightWidget[]; // widgets from the most recent generate_insights call
  addInsights: (widgets: InsightWidget[]) => void;
  /** Show a single insight on the map. No-op if one with the same id is already shown. */
  addInsight: (widget: InsightWidget) => void;
  /** Hide a single insight from the map by id. */
  removeInsight: (id: string) => void;
  consumePendingBatch: () => InsightWidget[];
  clearInsights: () => void;
  /**
   * Id of the widget the workspace card is showing, or null when it shows
   * none. `InsightWorkspace` owns the pager order, so it publishes this; a
   * chat request reads it to tell the agent which chart is on screen.
   */
  focusedWidgetId: string | null;
  setFocusedWidgetId: (id: string | null) => void;
  /** The workspace card is collapsed to its header, so no chart is on screen. */
  isWorkspaceCollapsed: boolean;
  setWorkspaceCollapsed: (collapsed: boolean) => void;
}

const useInsightStore = create<InsightState>((set, get) => ({
  insights: [],
  pendingBatch: [],
  addInsights: (widgets) =>
    set((state) => ({
      insights: [...state.insights, ...widgets],
      pendingBatch: widgets,
    })),
  addInsight: (widget) =>
    set((state) => {
      if (widget.id && state.insights.some((i) => i.id === widget.id)) {
        return state;
      }
      return { insights: [...state.insights, widget] };
    }),
  removeInsight: (id) =>
    set((state) => ({
      insights: state.insights.filter((i) => i.id !== id),
    })),
  consumePendingBatch: () => {
    const batch = get().pendingBatch;
    set({ pendingBatch: [] });
    return batch;
  },
  clearInsights: () => set({ insights: [], pendingBatch: [] }),
  focusedWidgetId: null,
  setFocusedWidgetId: (id) => set({ focusedWidgetId: id }),
  isWorkspaceCollapsed: false,
  setWorkspaceCollapsed: (collapsed) =>
    set({ isWorkspaceCollapsed: collapsed }),
}));

export default useInsightStore;
