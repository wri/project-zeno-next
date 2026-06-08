import type { ChartDTO } from "./chart-dto";

/** Terminal output of an analysis. */
export interface AnalysisResult {
  id: string;
  charts: ChartDTO[];
  /** Area parameters used to run the analysis — threaded through for provenance. */
  params?: {
    source: string;
    srcId?: string;
    subtype?: string;
    name: string;
  };
}
