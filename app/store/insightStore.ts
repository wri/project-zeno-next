import { create } from "zustand";
import { InsightWidget } from "@/app/types/chat";

interface InsightState {
  insights: InsightWidget[];
  pendingBatch: InsightWidget[]; // widgets from the most recent generate_insights call
  addInsights: (widgets: InsightWidget[]) => void;
  consumePendingBatch: () => InsightWidget[];
  clearInsights: () => void;
}

const useInsightStore = create<InsightState>((set, get) => ({
  insights: [],
  pendingBatch: [],
  addInsights: (widgets) =>
    set((state) => {
      // Widgets carrying an insightId (search_insights re-surfacing one, or
      // update_insight_display restyling one) replace any earlier widgets for
      // that same insight instead of duplicating the card. Widgets without an
      // insightId (older data, or generate_insights before it's persisted)
      // always append.
      const incomingIds = new Set(
        widgets
          .map((w) => w.insightId)
          .filter((id): id is string => Boolean(id))
      );
      const kept = incomingIds.size
        ? state.insights.filter(
            (w) => !w.insightId || !incomingIds.has(w.insightId)
          )
        : state.insights;
      return {
        insights: [...kept, ...widgets],
        pendingBatch: widgets,
      };
    }),
  consumePendingBatch: () => {
    const batch = get().pendingBatch;
    set({ pendingBatch: [] });
    return batch;
  },
  clearInsights: () => set({ insights: [], pendingBatch: [] }),
}));

export default useInsightStore;
