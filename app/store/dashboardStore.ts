import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import type {
  AreaDashboard,
  Block,
  BlockSize,
  PinnedAoi,
} from "@/app/types/portfolio";

interface DashboardState {
  dashboards: AreaDashboard[];
  hasHydrated: boolean;
}

interface DashboardActions {
  createDashboard: (input: {
    name?: string;
    aoi: PinnedAoi;
    seededFromInsightId: string;
  }) => AreaDashboard;
  deleteDashboard: (id: string) => void;
  getById: (id: string) => AreaDashboard | undefined;
  addInsightBlock: (dashboardId: string, insightId: string) => void;
  addAnnotationBlock: (dashboardId: string, text?: string) => void;
  addMapBlock: (dashboardId: string, aoi: PinnedAoi) => void;
  updateAnnotation: (
    dashboardId: string,
    blockId: string,
    text: string
  ) => void;
  resizeBlock: (dashboardId: string, blockId: string, size: BlockSize) => void;
  removeBlock: (dashboardId: string, blockId: string) => void;
  reorderBlocks: (dashboardId: string, orderedBlockIds: string[]) => void;
  setHasHydrated: (v: boolean) => void;
}

function nowIso() {
  return new Date().toISOString();
}

function touch(dashboard: AreaDashboard): AreaDashboard {
  return { ...dashboard, updatedAt: nowIso() };
}

const useDashboardStore = create<DashboardState & DashboardActions>()(
  persist(
    (set, get) => ({
      dashboards: [],
      hasHydrated: false,

      createDashboard: ({ name, aoi, seededFromInsightId }) => {
        const ts = nowIso();
        const dashboard: AreaDashboard = {
          id: uuidv4(),
          name: name?.trim() || aoi.name,
          aoi,
          seededFromInsightId,
          blocks: [
            {
              id: uuidv4(),
              type: "insight",
              insightId: seededFromInsightId,
            },
          ],
          createdAt: ts,
          updatedAt: ts,
        };
        set((state) => ({ dashboards: [dashboard, ...state.dashboards] }));
        return dashboard;
      },

      deleteDashboard: (id) =>
        set((state) => ({
          dashboards: state.dashboards.filter((d) => d.id !== id),
        })),

      getById: (id) => get().dashboards.find((d) => d.id === id),

      addInsightBlock: (dashboardId, insightId) =>
        set((state) => ({
          dashboards: state.dashboards.map((d) => {
            if (d.id !== dashboardId) return d;
            const block: Block = {
              id: uuidv4(),
              type: "insight",
              insightId,
            };
            return touch({ ...d, blocks: [...d.blocks, block] });
          }),
        })),

      addAnnotationBlock: (dashboardId, text = "") =>
        set((state) => ({
          dashboards: state.dashboards.map((d) => {
            if (d.id !== dashboardId) return d;
            const block: Block = {
              id: uuidv4(),
              type: "annotation",
              text,
            };
            return touch({ ...d, blocks: [...d.blocks, block] });
          }),
        })),

      addMapBlock: (dashboardId, aoi) =>
        set((state) => ({
          dashboards: state.dashboards.map((d) => {
            if (d.id !== dashboardId) return d;
            const block: Block = {
              id: uuidv4(),
              type: "map",
              aoi,
              size: "wide",
            };
            return touch({ ...d, blocks: [...d.blocks, block] });
          }),
        })),

      updateAnnotation: (dashboardId, blockId, text) =>
        set((state) => ({
          dashboards: state.dashboards.map((d) =>
            d.id !== dashboardId
              ? d
              : touch({
                  ...d,
                  blocks: d.blocks.map((b) =>
                    b.id === blockId && b.type === "annotation"
                      ? { ...b, text }
                      : b
                  ),
                })
          ),
        })),

      resizeBlock: (dashboardId, blockId, size) =>
        set((state) => ({
          dashboards: state.dashboards.map((d) =>
            d.id !== dashboardId
              ? d
              : touch({
                  ...d,
                  blocks: d.blocks.map((b) =>
                    b.id === blockId ? { ...b, size } : b
                  ),
                })
          ),
        })),

      removeBlock: (dashboardId, blockId) =>
        set((state) => ({
          dashboards: state.dashboards.map((d) =>
            d.id !== dashboardId
              ? d
              : touch({
                  ...d,
                  blocks: d.blocks.filter((b) => b.id !== blockId),
                })
          ),
        })),

      reorderBlocks: (dashboardId, orderedBlockIds) =>
        set((state) => ({
          dashboards: state.dashboards.map((d) => {
            if (d.id !== dashboardId) return d;
            const byId = new Map(d.blocks.map((b) => [b.id, b]));
            const reordered = orderedBlockIds
              .map((id) => byId.get(id))
              .filter((b): b is Block => !!b);
            const missing = d.blocks.filter(
              (b) => !orderedBlockIds.includes(b.id)
            );
            return touch({ ...d, blocks: [...reordered, ...missing] });
          }),
        })),

      setHasHydrated: (v) => set({ hasHydrated: v }),
    }),
    {
      name: "gnw_dashboards",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ dashboards: state.dashboards }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

export default useDashboardStore;
