/**
 * Public API of the `analysis` feature (ported from
 * feat/analysis-enhancements-PZB-957 — runtime flow only).
 *
 * Consumers import ONLY from this barrel. The flow: a caller builds an
 * AnalysisSelection (area + dataset + dates), `useAnalysis().run(...)` drives
 * the LRO over the REST gateway, and completed charts are pushed into
 * insightStore so they surface in the map's InsightWorkspace.
 */
export { useAnalysis, type AnalysisStatus } from "./ui/use-analysis";
export type { AreaSelection } from "./model/area-selection";
export type { AnalysisSelection } from "./model/analysis-selection";
