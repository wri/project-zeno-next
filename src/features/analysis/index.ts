/**
 * Public API of the `analysis` feature (FSD slice).
 *
 * Other slices import ONLY from this barrel — never reach into segment files
 * directly. Keeps the slice's internals free to move.
 */
export { AnalysisCTA } from "./ui/AnalysisCTA";
export { useAnalysis, type AnalysisStatus } from "./ui/use-analysis";
export {
  default as useSelectionStore,
  type LngLat,
} from "./model/selection-store";
export type { AreaSelection } from "./model/area-selection";
export type { AnalysisSelection } from "./model/analysis-selection";
