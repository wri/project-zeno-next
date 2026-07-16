import { create } from "zustand";
import { InsightWidget } from "@/app/types/chat";

interface InsightState {
  insights: InsightWidget[];
  pendingBatch: InsightWidget[]; // widgets from the most recent generate_insights call
  addInsights: (widgets: InsightWidget[]) => void;
  /** Show a single insight on the map. No-op if one with the same id is already shown. */
  addInsight: (widget: InsightWidget) => void;
  /** Hide a single insight from the map by id. */
  removeInsight: (id: string) => void;
  consumePendingBatch: () => InsightWidget[];
  clearInsights: () => void;
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
}));

export default useInsightStore;
