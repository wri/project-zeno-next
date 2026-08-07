import { RestAnalysisGateway } from "../api/rest-analysis-gateway";
import { SystemClock } from "../lib/system-clock";
import type { AnalysisService } from "../model/analysis-service";
import { LROAnalysisService } from "../model/lro-analysis-service";

/**
 * Composition root shared by the feature's driving adapters (the map's
 * `useAnalysis`, the dashboards' `useCuratedAnalysis`): the real application
 * service wired with the real gateway and clock. Tests inject their own fakes
 * via the hooks' parameters instead of touching this.
 */
export const defaultAnalysisService: AnalysisService = new LROAnalysisService(
  new RestAnalysisGateway(),
  new SystemClock()
);
