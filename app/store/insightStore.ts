import { create } from "zustand";
import { InsightWidget } from "@/app/types/chat";

interface InsightState {
  insights: InsightWidget[];
  addInsights: (widgets: InsightWidget[]) => void;
  clearInsights: () => void;
}

const useInsightStore = create<InsightState>((set) => ({
  insights: [],
  addInsights: (widgets) =>
    set((state) => ({ insights: [...state.insights, ...widgets] })),
  clearInsights: () => set({ insights: [] }),
}));

export default useInsightStore;
