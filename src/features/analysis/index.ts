/**
 * Public API of the `analysis` feature (FSD slice).
 *
 * Other slices import ONLY from this barrel — never reach into segment files
 * directly. Keeps the slice's internals free to move.
 */
export { default as ViewAnalysisNudge } from "./ui/ViewAnalysisNudge";
export { ViewAnalysisTrigger } from "./ui/ViewAnalysisTrigger";
export { useAnalysis, type AnalysisStatus } from "./ui/use-analysis";
export { analysisService } from "./ui/analysis-service";
export type { AnalysisService } from "./model/analysis-service";
export { AnalysisJobFailedError } from "./model/analysis-error";
export {
  DEFAULT_ANALYSIS_START_DATE,
  DEFAULT_ANALYSIS_END_DATE,
} from "./lib/default-analysis-window";
export type { AnalysisResult } from "./model/analysis-result";
export { default as useSelectionStore } from "./model/selection-store";
export type { AreaSelection } from "./model/area-selection";
export type { AnalysisSelection } from "./model/analysis-selection";
export {
  CURATED_ANALYSES,
  curatedCatalogue,
  stripYearRangeSuffix,
  type CuratedAnalysisEntry,
  type CuratedAnalysisSpec,
} from "./lib/curated-catalogue";
export {
  useCuratedAnalysis,
  curatedAnalysisQueryOptions,
  type CuratedAnalysisState,
  type UseCuratedAnalysis,
} from "./ui/use-curated-analysis";
