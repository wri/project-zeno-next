import type { Chart } from "@/src/entities/insight";

/** Terminal output of an analysis. */
export interface AnalysisResult {
  id: string;
  charts: Chart[];
  /** Area parameters used to run the analysis — threaded through for provenance. */
  params?: {
    source: string;
    srcId?: string;
    subtype?: string;
    name: string;
  };
}
