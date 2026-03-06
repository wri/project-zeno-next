import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { get as idbGet, set as idbSet, del as idbDel } from "idb-keyval";
import { v4 as uuidv4 } from "uuid";
import type { ReportBlock } from "@/app/types/report";
import type { Dashboard, DashboardSetupMetadata } from "@/app/types/dashboard";

// -- State & Actions --------------------------------------------------------

interface DashboardState {
  dashboards: Dashboard[];
  activeDashboardId: string | null;
}

interface DashboardActions {
  createDashboard: (
    title: string,
    setupMetadata: DashboardSetupMetadata,
    blocks: ReportBlock[],
  ) => string;
  deleteDashboard: (id: string) => void;
  renameDashboard: (id: string, title: string) => void;
  setActiveDashboard: (id: string | null) => void;
  getActiveDashboard: () => Dashboard | undefined;

  addBlock: (
    dashboardId: string,
    block: Omit<ReportBlock, "id" | "order" | "createdAt" | "size"> & {
      size?: "full" | "half";
    },
  ) => void;
  removeBlock: (dashboardId: string, blockId: string) => void;
  updateBlockContent: (
    dashboardId: string,
    blockId: string,
    content: string,
  ) => void;
  reorderBlocks: (dashboardId: string, orderedBlockIds: string[]) => void;
  resizeBlock: (
    dashboardId: string,
    blockId: string,
    size: "full" | "half",
  ) => void;
  insertBlockAfter: (
    dashboardId: string,
    afterBlockId: string,
    block: Omit<ReportBlock, "id" | "order" | "createdAt" | "size"> & {
      size?: "full" | "half";
    },
  ) => string;
}

// -- IndexedDB storage adapter ----------------------------------------------

const idbStorage = createJSONStorage<DashboardState>(() => ({
  getItem: async (key: string) => {
    const val = await idbGet(key);
    return val ?? null;
  },
  setItem: async (key: string, value: string) => {
    await idbSet(key, value);
  },
  removeItem: async (key: string) => {
    await idbDel(key);
  },
}));

// -- Initial state ----------------------------------------------------------

const initialState: DashboardState = {
  dashboards: [],
  activeDashboardId: null,
};

// -- Store ------------------------------------------------------------------

const useDashboardStore = create<DashboardState & DashboardActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      createDashboard: (title, setupMetadata, blocks) => {
        const id = uuidv4();
        const now = new Date().toISOString();
        const dashboard: Dashboard = {
          id,
          title,
          blocks,
          setupMetadata,
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({
          dashboards: [...s.dashboards, dashboard],
          activeDashboardId: id,
        }));
        return id;
      },

      deleteDashboard: (id) =>
        set((s) => ({
          dashboards: s.dashboards.filter((d) => d.id !== id),
          activeDashboardId:
            s.activeDashboardId === id ? null : s.activeDashboardId,
        })),

      renameDashboard: (id, title) =>
        set((s) => ({
          dashboards: s.dashboards.map((d) =>
            d.id === id
              ? { ...d, title, updatedAt: new Date().toISOString() }
              : d,
          ),
        })),

      setActiveDashboard: (id) => set({ activeDashboardId: id }),

      getActiveDashboard: () => {
        const { dashboards, activeDashboardId } = get();
        return dashboards.find((d) => d.id === activeDashboardId);
      },

      addBlock: (dashboardId, block) =>
        set((s) => ({
          dashboards: s.dashboards.map((d) => {
            if (d.id !== dashboardId) return d;
            const newBlock: ReportBlock = {
              ...block,
              id: uuidv4(),
              size: block.size ?? "full",
              order: d.blocks.length,
              createdAt: new Date().toISOString(),
            };
            return {
              ...d,
              blocks: [...d.blocks, newBlock],
              updatedAt: new Date().toISOString(),
            };
          }),
        })),

      removeBlock: (dashboardId, blockId) =>
        set((s) => ({
          dashboards: s.dashboards.map((d) => {
            if (d.id !== dashboardId) return d;
            const filtered = d.blocks
              .filter((b) => b.id !== blockId)
              .map((b, i) => ({ ...b, order: i }));
            return {
              ...d,
              blocks: filtered,
              updatedAt: new Date().toISOString(),
            };
          }),
        })),

      updateBlockContent: (dashboardId, blockId, content) =>
        set((s) => ({
          dashboards: s.dashboards.map((d) => {
            if (d.id !== dashboardId) return d;
            return {
              ...d,
              blocks: d.blocks.map((b) =>
                b.id === blockId ? { ...b, content } : b,
              ),
              updatedAt: new Date().toISOString(),
            };
          }),
        })),

      reorderBlocks: (dashboardId, orderedBlockIds) =>
        set((s) => ({
          dashboards: s.dashboards.map((d) => {
            if (d.id !== dashboardId) return d;
            const blockMap = new Map(d.blocks.map((b) => [b.id, b]));
            const reordered = orderedBlockIds
              .map((id, i) => {
                const b = blockMap.get(id);
                return b ? { ...b, order: i } : null;
              })
              .filter(Boolean) as ReportBlock[];
            return {
              ...d,
              blocks: reordered,
              updatedAt: new Date().toISOString(),
            };
          }),
        })),

      resizeBlock: (dashboardId, blockId, size) =>
        set((s) => ({
          dashboards: s.dashboards.map((d) => {
            if (d.id !== dashboardId) return d;
            return {
              ...d,
              blocks: d.blocks.map((b) =>
                b.id === blockId ? { ...b, size } : b,
              ),
              updatedAt: new Date().toISOString(),
            };
          }),
        })),

      insertBlockAfter: (dashboardId, afterBlockId, block) => {
        const newId = uuidv4();
        set((s) => ({
          dashboards: s.dashboards.map((d) => {
            if (d.id !== dashboardId) return d;
            const sorted = [...d.blocks].sort((a, b) => a.order - b.order);
            const afterIdx = sorted.findIndex((b) => b.id === afterBlockId);
            const insertAt = afterIdx === -1 ? sorted.length : afterIdx + 1;

            const newBlock: ReportBlock = {
              ...block,
              id: newId,
              size: block.size ?? "full",
              order: insertAt,
              createdAt: new Date().toISOString(),
            };

            sorted.splice(insertAt, 0, newBlock);
            const reindexed = sorted.map((b, i) => ({ ...b, order: i }));

            return {
              ...d,
              blocks: reindexed,
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
        return newId;
      },
    }),
    {
      name: "dashboard-store",
      storage: idbStorage,
      version: 1,
    },
  ),
);

export default useDashboardStore;
