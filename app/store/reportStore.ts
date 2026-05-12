import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import type {
  Block,
  BlockSize,
  PinnedAoi,
  Report,
} from "@/app/types/portfolio";

interface ReportState {
  reports: Report[];
  hasHydrated: boolean;
}

interface ReportActions {
  createReport: (name?: string, initialInsightIds?: string[]) => Report;
  renameReport: (id: string, name: string) => void;
  deleteReport: (id: string) => void;
  getById: (id: string) => Report | undefined;
  addInsightBlock: (reportId: string, insightId: string) => void;
  addAnnotationBlock: (reportId: string, text?: string) => void;
  addMapBlock: (reportId: string, aoi: PinnedAoi) => void;
  updateAnnotation: (reportId: string, blockId: string, text: string) => void;
  resizeBlock: (reportId: string, blockId: string, size: BlockSize) => void;
  removeBlock: (reportId: string, blockId: string) => void;
  reorderBlocks: (reportId: string, orderedBlockIds: string[]) => void;
  setHasHydrated: (v: boolean) => void;
}

function nowIso() {
  return new Date().toISOString();
}

function touch(report: Report): Report {
  return { ...report, updatedAt: nowIso() };
}

const useReportStore = create<ReportState & ReportActions>()(
  persist(
    (set, get) => ({
      reports: [],
      hasHydrated: false,

      createReport: (name, initialInsightIds = []) => {
        const ts = nowIso();
        const report: Report = {
          id: uuidv4(),
          name: name?.trim() || "Untitled report",
          blocks: initialInsightIds.map((insightId) => ({
            id: uuidv4(),
            type: "insight",
            insightId,
          })),
          createdAt: ts,
          updatedAt: ts,
        };
        set((state) => ({ reports: [report, ...state.reports] }));
        return report;
      },

      renameReport: (id, name) =>
        set((state) => ({
          reports: state.reports.map((r) =>
            r.id === id ? touch({ ...r, name: name.trim() || r.name }) : r
          ),
        })),

      deleteReport: (id) =>
        set((state) => ({
          reports: state.reports.filter((r) => r.id !== id),
        })),

      getById: (id) => get().reports.find((r) => r.id === id),

      addInsightBlock: (reportId, insightId) =>
        set((state) => ({
          reports: state.reports.map((r) => {
            if (r.id !== reportId) return r;
            // Dedupe — don't pin the same insight twice into one report.
            if (
              r.blocks.some(
                (b) => b.type === "insight" && b.insightId === insightId
              )
            ) {
              return r;
            }
            const block: Block = {
              id: uuidv4(),
              type: "insight",
              insightId,
            };
            return touch({ ...r, blocks: [...r.blocks, block] });
          }),
        })),

      addAnnotationBlock: (reportId, text = "") =>
        set((state) => ({
          reports: state.reports.map((r) => {
            if (r.id !== reportId) return r;
            const block: Block = {
              id: uuidv4(),
              type: "annotation",
              text,
            };
            return touch({ ...r, blocks: [...r.blocks, block] });
          }),
        })),

      addMapBlock: (reportId, aoi) =>
        set((state) => ({
          reports: state.reports.map((r) => {
            if (r.id !== reportId) return r;
            const block: Block = {
              id: uuidv4(),
              type: "map",
              aoi,
              size: "wide",
            };
            return touch({ ...r, blocks: [...r.blocks, block] });
          }),
        })),

      updateAnnotation: (reportId, blockId, text) =>
        set((state) => ({
          reports: state.reports.map((r) =>
            r.id !== reportId
              ? r
              : touch({
                  ...r,
                  blocks: r.blocks.map((b) =>
                    b.id === blockId && b.type === "annotation"
                      ? { ...b, text }
                      : b
                  ),
                })
          ),
        })),

      resizeBlock: (reportId, blockId, size) =>
        set((state) => ({
          reports: state.reports.map((r) =>
            r.id !== reportId
              ? r
              : touch({
                  ...r,
                  blocks: r.blocks.map((b) =>
                    b.id === blockId ? { ...b, size } : b
                  ),
                })
          ),
        })),

      removeBlock: (reportId, blockId) =>
        set((state) => ({
          reports: state.reports.map((r) =>
            r.id !== reportId
              ? r
              : touch({
                  ...r,
                  blocks: r.blocks.filter((b) => b.id !== blockId),
                })
          ),
        })),

      reorderBlocks: (reportId, orderedBlockIds) =>
        set((state) => ({
          reports: state.reports.map((r) => {
            if (r.id !== reportId) return r;
            const byId = new Map(r.blocks.map((b) => [b.id, b]));
            const reordered = orderedBlockIds
              .map((id) => byId.get(id))
              .filter((b): b is Block => !!b);
            // Append any blocks that were not in the supplied order, defensively.
            const missing = r.blocks.filter(
              (b) => !orderedBlockIds.includes(b.id)
            );
            return touch({ ...r, blocks: [...reordered, ...missing] });
          }),
        })),

      setHasHydrated: (v) => set({ hasHydrated: v }),
    }),
    {
      name: "gnw_reports",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ reports: state.reports }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

export default useReportStore;
