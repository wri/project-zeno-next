import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { get as idbGet, set as idbSet, del as idbDel } from "idb-keyval";
import { v4 as uuidv4 } from "uuid";
import { Report, ReportBlock, PinnedWidget } from "@/app/types/report";
import { InsightWidget } from "@/app/types/chat";

/** Max chart/table widgets per report */
const MAX_INSIGHT_BLOCKS = 20;

/** Tables are truncated to this many rows when pinned */
const MAX_TABLE_ROWS = 10;

// ── State & Actions ──────────────────────────────────────────────────

interface ReportState {
  reports: Report[];
  activeReportId: string | null;
}

interface ReportActions {
  createReport: (title?: string) => string;
  deleteReport: (reportId: string) => void;
  renameReport: (reportId: string, title: string) => void;
  setActiveReport: (reportId: string | null) => void;
  getActiveReport: () => Report | undefined;

  addBlock: (
    reportId: string,
    block: Omit<ReportBlock, "id" | "order" | "createdAt">
  ) => void;
  removeBlock: (reportId: string, blockId: string) => void;
  updateBlockContent: (
    reportId: string,
    blockId: string,
    content: string
  ) => void;
  reorderBlocks: (reportId: string, orderedBlockIds: string[]) => void;

  /**
   * Pin a chat insight widget into a report.
   * Returns `false` if the per-report insight cap has been reached.
   */
  pinWidget: (
    reportId: string,
    widget: InsightWidget,
    threadId: string,
    traceId?: string,
    messageId?: string
  ) => boolean;
}

// ── IndexedDB storage adapter ────────────────────────────────────────

const idbStorage = createJSONStorage<ReportState>(() => ({
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

// ── Initial state ────────────────────────────────────────────────────

const initialState: ReportState = {
  reports: [],
  activeReportId: null,
};

// ── Store ────────────────────────────────────────────────────────────

const useReportStore = create<ReportState & ReportActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ── Report CRUD ──────────────────────────────────────────────

      createReport: (title) => {
        const id = uuidv4();
        const now = new Date().toISOString();
        const report: Report = {
          id,
          title: title ?? "Untitled Report",
          blocks: [],
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({
          reports: [...s.reports, report],
          activeReportId: id,
        }));
        return id;
      },

      deleteReport: (reportId) =>
        set((s) => ({
          reports: s.reports.filter((r) => r.id !== reportId),
          activeReportId:
            s.activeReportId === reportId ? null : s.activeReportId,
        })),

      renameReport: (reportId, title) =>
        set((s) => ({
          reports: s.reports.map((r) =>
            r.id === reportId
              ? { ...r, title, updatedAt: new Date().toISOString() }
              : r
          ),
        })),

      setActiveReport: (reportId) => set({ activeReportId: reportId }),

      getActiveReport: () => {
        const { reports, activeReportId } = get();
        return reports.find((r) => r.id === activeReportId);
      },

      // ── Block operations ─────────────────────────────────────────

      addBlock: (reportId, block) =>
        set((s) => ({
          reports: s.reports.map((r) => {
            if (r.id !== reportId) return r;
            const newBlock: ReportBlock = {
              ...block,
              id: uuidv4(),
              order: r.blocks.length,
              createdAt: new Date().toISOString(),
            };
            return {
              ...r,
              blocks: [...r.blocks, newBlock],
              updatedAt: new Date().toISOString(),
            };
          }),
        })),

      removeBlock: (reportId, blockId) =>
        set((s) => ({
          reports: s.reports.map((r) => {
            if (r.id !== reportId) return r;
            const filtered = r.blocks
              .filter((b) => b.id !== blockId)
              .map((b, i) => ({ ...b, order: i }));
            return {
              ...r,
              blocks: filtered,
              updatedAt: new Date().toISOString(),
            };
          }),
        })),

      updateBlockContent: (reportId, blockId, content) =>
        set((s) => ({
          reports: s.reports.map((r) => {
            if (r.id !== reportId) return r;
            return {
              ...r,
              blocks: r.blocks.map((b) =>
                b.id === blockId ? { ...b, content } : b
              ),
              updatedAt: new Date().toISOString(),
            };
          }),
        })),

      reorderBlocks: (reportId, orderedBlockIds) =>
        set((s) => ({
          reports: s.reports.map((r) => {
            if (r.id !== reportId) return r;
            const blockMap = new Map(r.blocks.map((b) => [b.id, b]));
            const reordered = orderedBlockIds
              .map((id, i) => {
                const b = blockMap.get(id);
                return b ? { ...b, order: i } : null;
              })
              .filter(Boolean) as ReportBlock[];
            return {
              ...r,
              blocks: reordered,
              updatedAt: new Date().toISOString(),
            };
          }),
        })),

      // ── Pin from chat ────────────────────────────────────────────

      pinWidget: (reportId, widget, threadId, traceId, messageId) => {
        const report = get().reports.find((r) => r.id === reportId);
        if (!report) return false;

        // Enforce per-report insight cap
        const insightCount = report.blocks.filter(
          (b) => b.kind === "insight"
        ).length;
        if (insightCount >= MAX_INSIGHT_BLOCKS) {
          return false;
        }

        // For tables, truncate to MAX_TABLE_ROWS and record the original count
        let cappedData = widget.data;
        let truncatedFrom: number | undefined;
        if (widget.type === "table" && Array.isArray(widget.data)) {
          if (widget.data.length > MAX_TABLE_ROWS) {
            truncatedFrom = widget.data.length;
            cappedData = widget.data.slice(0, MAX_TABLE_ROWS);
          }
        }

        // Strip generation entirely — no provenance stored
        const pinned: PinnedWidget = {
          type: widget.type,
          title: widget.title,
          description: widget.description,
          data: cappedData,
          xAxis: widget.xAxis,
          yAxis: widget.yAxis,
          sourceThreadId: threadId,
          sourceTraceId: traceId,
          sourceMessageId: messageId,
          truncatedFrom,
        };

        get().addBlock(reportId, { kind: "insight", widget: pinned });
        return true;
      },
    }),
    {
      name: "report-store",
      storage: idbStorage,
    }
  )
);

export default useReportStore;
