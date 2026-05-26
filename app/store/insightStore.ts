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
    set((state) => ({
      insights: [...state.insights, ...widgets],
      pendingBatch: widgets,
    })),
  consumePendingBatch: () => {
    const batch = get().pendingBatch;
    set({ pendingBatch: [] });
    return batch;
  },
  clearInsights: () => set({ insights: [], pendingBatch: [] }),
}));

export default useInsightStore;
