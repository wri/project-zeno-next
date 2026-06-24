import type { AnalysisSelection } from "../domain/analysis-selection";
import type { AnalysisResult } from "../domain/analysis-result";

/**
 * The driving port the UI calls. The real implementation — the LRO state
 * machine over the AnalysisGateway — lands later (bottom of the stack).
 * For now the hook depends only on this shape, so it can be faked in tests.
 */
export interface AnalysisService {
  /**
   * Runs an analysis for the given selection.
   * If `signal` is aborted before the analysis completes, the returned promise
   * rejects with a `DOMException` whose `name` is `"AbortError"`.
   */
  run(
    selection: AnalysisSelection,
    signal?: AbortSignal
  ): Promise<AnalysisResult>;
}
