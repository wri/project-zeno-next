import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import type { PinnedInsight } from "@/app/types/portfolio";
import { buildSeedInsights } from "@/app/lib/portfolio/seedInsights";

interface InsightState {
  insights: PinnedInsight[];
  hasSeeded: boolean;
  hasHydrated: boolean;
}

interface InsightActions {
  addInsight: (
    insight: Omit<PinnedInsight, "id" | "pinnedAt"> & {
      id?: string;
      pinnedAt?: string;
    }
  ) => PinnedInsight;
  removeInsight: (id: string) => void;
  getById: (id: string) => PinnedInsight | undefined;
  findDuplicate: (
    title: string,
    aoiKey: string,
    datasetName?: string
  ) => PinnedInsight | undefined;
  seedIfEmpty: () => void;
  setHasHydrated: (v: boolean) => void;
}

// A stable key for dedupe — title + sorted src_ids + datasetName.
export function buildAoiKey(src_ids: string[], aoiName: string): string {
  if (src_ids.length === 0) return aoiName;
  return [...src_ids].sort().join(",");
}

const useInsightStore = create<InsightState & InsightActions>()(
  persist(
    (set, get) => ({
      insights: [],
      hasSeeded: false,
      hasHydrated: false,

      addInsight: (input) => {
        const record: PinnedInsight = {
          id: input.id ?? uuidv4(),
          pinnedAt: input.pinnedAt ?? new Date().toISOString(),
          title: input.title,
          description: input.description,
          datasetName: input.datasetName,
          chartType: input.chartType,
          aoi: input.aoi,
          threadId: input.threadId,
          data: input.data,
          xAxis: input.xAxis,
          yAxis: input.yAxis,
        };
        set((state) => ({ insights: [record, ...state.insights] }));
        return record;
      },

      removeInsight: (id) =>
        set((state) => ({
          insights: state.insights.filter((i) => i.id !== id),
        })),

      getById: (id) => get().insights.find((i) => i.id === id),

      findDuplicate: (title, aoiKey, datasetName) =>
        get().insights.find((i) => {
          const otherKey = buildAoiKey(i.aoi.src_ids, i.aoi.name);
          return (
            i.title === title &&
            otherKey === aoiKey &&
            (i.datasetName ?? "") === (datasetName ?? "")
          );
        }),

      seedIfEmpty: () => {
        const { insights, hasSeeded } = get();
        if (hasSeeded || insights.length > 0) return;
        set({ insights: buildSeedInsights(), hasSeeded: true });
      },

      setHasHydrated: (v) => set({ hasHydrated: v }),
    }),
    {
      name: "gnw_insights",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        insights: state.insights,
        hasSeeded: state.hasSeeded,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

export default useInsightStore;
