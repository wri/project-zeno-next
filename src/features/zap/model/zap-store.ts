import { create } from "zustand";

import type { ZapMapView, ZapStepStatus } from "./zap-plan";
import {
  EMPTY_TRAIL,
  addRow,
  loadTrail,
  saveTrail,
  type ZapRow,
  type ZapTrail,
} from "./zap-trail";

export type ZapMode = "chat" | "zap";
export type ZapStatus = "idle" | "planning" | "running" | "done" | "error";

interface ZapState extends ZapTrail {
  /** Chat sends the prompt to the agent; zap plans and runs it directly. */
  mode: ZapMode;
  /** The prompt that is in planning. It has no row yet. */
  prompt: string;
  status: ZapStatus;
  error: string | null;
  /**
   * The analysis step to run. `ZapRunner` runs it, because the analysis must
   * outlive the panel that started it.
   */
  pendingAnalysis: { rowId: string; step: number } | null;

  setMode: (mode: ZapMode) => void;
  start: (prompt: string) => void;
  /** Adds the row of a new plan after the selected row and selects it. */
  addRow: (row: Omit<ZapRow, "stepStatus">, before: ZapMapView) => void;
  setStep: (rowId: string, step: number, status: ZapStepStatus) => void;
  setView: (rowId: string, view: ZapMapView) => void;
  requestAnalysis: (rowId: string, step: number) => void;
  /** Selects a row; -1 is the map before the first row. */
  select: (index: number) => void;
  finish: () => void;
  fail: (error: string) => void;
  /** Reads the trail from session storage again. */
  restore: () => void;
  /** Removes the trail. The map does not change. */
  reset: () => void;
}

const MODE_KEY = "gnw:zap-mode";

function readMode(): ZapMode {
  try {
    return localStorage.getItem(MODE_KEY) === "zap" ? "zap" : "chat";
  } catch {
    return "chat";
  }
}

const idle = {
  prompt: "",
  status: "idle" as ZapStatus,
  error: null,
  pendingAnalysis: null,
};

const updateRow = (
  rows: ZapRow[],
  rowId: string,
  change: (row: ZapRow) => ZapRow
): ZapRow[] => rows.map((row) => (row.id === rowId ? change(row) : row));

const useZapStore = create<ZapState>((set) => ({
  mode: typeof window === "undefined" ? "chat" : readMode(),
  ...idle,
  ...(typeof window === "undefined" ? EMPTY_TRAIL : loadTrail()),

  setMode: (mode) => {
    try {
      localStorage.setItem(MODE_KEY, mode);
    } catch {
      // Only remembered when browser storage works.
    }
    set({ mode });
  },
  start: (prompt) => set({ ...idle, prompt, status: "planning" }),
  addRow: (row, before) =>
    set((state) => ({
      ...addRow(
        state,
        { ...row, stepStatus: row.plan.steps.map(() => "pending") },
        before
      ),
      prompt: "",
      status: "running",
    })),
  setStep: (rowId, step, status) =>
    set((state) => ({
      rows: updateRow(state.rows, rowId, (row) => ({
        ...row,
        stepStatus: row.stepStatus.map((s, i) => (i === step ? status : s)),
      })),
    })),
  setView: (rowId, view) =>
    set((state) => ({
      rows: updateRow(state.rows, rowId, (row) => ({ ...row, view })),
    })),
  requestAnalysis: (rowId, step) => set({ pendingAnalysis: { rowId, step } }),
  select: (index) =>
    set((state) =>
      index >= -1 && index < state.rows.length ? { index } : state
    ),
  finish: () => set({ status: "done", pendingAnalysis: null }),
  fail: (error) => set({ status: "error", error, pendingAnalysis: null }),
  restore: () => set(loadTrail()),
  reset: () => set({ ...idle, ...EMPTY_TRAIL }),
}));

// Keep the trail in session storage, so that it comes back on reload.
useZapStore.subscribe((state, previous) => {
  if (
    state.rows !== previous.rows ||
    state.index !== previous.index ||
    state.base !== previous.base
  ) {
    saveTrail(state);
  }
});

export default useZapStore;
