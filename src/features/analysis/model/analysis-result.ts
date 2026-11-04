import type { AnalysisInputs, Chart } from "@/src/entities/insight";

/** Terminal output of an analysis: the insight it persisted. */
export interface AnalysisResult {
  id: string;
  /** ISO-8601 timestamp the insight was stored (backend `created_at`). */
  createdAt: string;
  charts: Chart[];
  /** What the backend recorded the insight was computed from. */
  analysisInputs: AnalysisInputs;
}
