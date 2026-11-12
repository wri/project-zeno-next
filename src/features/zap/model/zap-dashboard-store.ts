import { create } from "zustand";

import type { ZapStepStatus } from "./zap-plan";
import {
  EMPTY_DASHBOARD_TRAIL,
  addDashboardRow,
  loadDashboardTrail,
  saveDashboardTrail,
  type ZapDashboardRow,
  type ZapDashboardTrail,
} from "./zap-dashboard-trail";
import type { ZapStatus } from "./zap-store";

interface ZapDashboardState extends ZapDashboardTrail {
  /** The dashboard of the trail in memory. */
  dashboardId: string | null;
  /** The prompt that is in planning. It has no row yet. */
  prompt: string;
  status: ZapStatus;
  error: string | null;

  /** Loads the trail of a dashboard, unless it is the trail in memory. */
  open: (dashboardId: string) => void;
  start: (prompt: string) => void;
  addRow: (row: ZapDashboardRow) => void;
  setStep: (rowId: string, step: number, status: ZapStepStatus) => void;
  updateRow: (
    rowId: string,
    change: (row: ZapDashboardRow) => Partial<ZapDashboardRow>
  ) => void;
  /** Shows the plan of a row. It does not change the dashboard. */
  select: (index: number) => void;
  setStatus: (status: ZapStatus) => void;
  fail: (error: string) => void;
  /** Removes the trail of the open dashboard. The dashboard does not change. */
  reset: () => void;
}

const idle = { prompt: "", status: "idle" as ZapStatus, error: null };

const useZapDashboardStore = create<ZapDashboardState>((set, get) => ({
  dashboardId: null,
  ...idle,
  ...EMPTY_DASHBOARD_TRAIL,

  open: (dashboardId) => {
    if (get().dashboardId === dashboardId) return;
    set({ dashboardId, ...idle, ...loadDashboardTrail(dashboardId) });
  },
  start: (prompt) => set({ prompt, status: "planning", error: null }),
  addRow: (row) =>
    set((state) => ({ ...addDashboardRow(state, row), prompt: "" })),
  setStep: (rowId, step, status) =>
    get().updateRow(rowId, (row) => ({
      stepStatus: row.stepStatus.map((s, i) => (i === step ? status : s)),
    })),
  updateRow: (rowId, change) =>
    set((state) => ({
      rows: state.rows.map((row) =>
        row.id === rowId ? { ...row, ...change(row) } : row
      ),
    })),
  select: (index) =>
    set((state) =>
      index >= 0 && index < state.rows.length ? { index } : state
    ),
  setStatus: (status) => set({ status }),
  fail: (error) => set({ status: "error", error, prompt: "" }),
  reset: () => set({ ...idle, ...EMPTY_DASHBOARD_TRAIL }),
}));

// Keep each dashboard trail in session storage, apart from the map trail.
useZapDashboardStore.subscribe((state, previous) => {
  if (state.dashboardId && state.rows !== previous.rows) {
    saveDashboardTrail(state.dashboardId, state);
  }
});

export default useZapDashboardStore;
