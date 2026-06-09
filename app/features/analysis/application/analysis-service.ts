import type { AnalysisSelection } from "../domain/analysis-selection";
import type { AnalysisResult } from "../domain/analysis-result";

/**
 * The driving port the UI calls. The real implementation — the LRO state
 * machine over the AnalysisGateway — lands later (bottom of the stack).
 * For now the hook depends only on this shape, so it can be faked in tests.
 */
export interface AnalysisService {
  run(selection: AnalysisSelection): Promise<AnalysisResult>;
}
