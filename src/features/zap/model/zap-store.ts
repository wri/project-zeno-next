import { create } from "zustand";

import type { ZapPlan, ZapStepStatus } from "./zap-plan";

export type ZapMode = "chat" | "zap";
export type ZapStatus = "idle" | "planning" | "running" | "done" | "error";

interface ZapState {
  /** Chat sends the prompt to the agent; zap plans and runs it directly. */
  mode: ZapMode;
  prompt: string;
  status: ZapStatus;
  plan: ZapPlan | null;
  stepStatus: ZapStepStatus[];
  error: string | null;
  /**
   * The index of the analysis step to run. `ZapRunner` runs it, because the
   * analysis must outlive the panel that started it.
   */
  pendingAnalysis: number | null;

  setMode: (mode: ZapMode) => void;
  start: (prompt: string) => void;
  setPlan: (plan: ZapPlan) => void;
  setStep: (index: number, status: ZapStepStatus) => void;
  requestAnalysis: (index: number) => void;
  finish: () => void;
  fail: (error: string) => void;
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
  plan: null,
  stepStatus: [],
  error: null,
  pendingAnalysis: null,
};

const useZapStore = create<ZapState>((set) => ({
  mode: typeof window === "undefined" ? "chat" : readMode(),
  ...idle,

  setMode: (mode) => {
    try {
      localStorage.setItem(MODE_KEY, mode);
    } catch {
      // Only remembered when browser storage works.
    }
    set({ mode });
  },
  start: (prompt) => set({ ...idle, prompt, status: "planning" }),
  setPlan: (plan) =>
    set({
      plan,
      status: "running",
      stepStatus: plan.steps.map(() => "pending"),
    }),
  setStep: (index, status) =>
    set((state) => ({
      stepStatus: state.stepStatus.map((s, i) => (i === index ? status : s)),
    })),
  requestAnalysis: (index) => set({ pendingAnalysis: index }),
  finish: () => set({ status: "done", pendingAnalysis: null }),
  fail: (error) => set({ status: "error", error, pendingAnalysis: null }),
  reset: () => set(idle),
}));

export default useZapStore;
