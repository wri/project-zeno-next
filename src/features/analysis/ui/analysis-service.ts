import type { AnalysisService } from "../model/analysis-service";
import { LROAnalysisService } from "../model/lro-analysis-service";
import { RestAnalysisGateway } from "../api/rest-analysis-gateway";
import { SystemClock } from "../lib/system-clock";

/**
 * Composition root for the analysis use-case: the real LRO service wired to its
 * real driven adapters.
 *
 * Exported from the slice barrel so other slices can run a non-generative
 * analysis without going through `useAnalysis` — the dashboards slice seeds a
 * new dashboard with one, and needs the resolved `AnalysisResult` (specifically
 * its persisted insight id) rather than the workspace side effect the hook
 * performs.
 */
export const analysisService: AnalysisService = new LROAnalysisService(
  new RestAnalysisGateway(),
  new SystemClock()
);
