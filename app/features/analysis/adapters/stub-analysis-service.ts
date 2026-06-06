import type { AnalysisService } from "../application/analysis-service";
import type { AreaSelection } from "../domain/area-selection";
import type { AnalysisResult } from "../domain/analysis-result";

/**
 * TEMPORARY stand-in for the real application service. Lets the feature be
 * exercised end-to-end behind `?ff=analysis` before the REST gateway + LRO
 * state machine exist. Replace with the real AnalysisService (bottom of stack).
 */
export class StubAnalysisService implements AnalysisService {
  // Default delay simulates a slow operation so the running state is visible
  // in the browser. Tests pass 0 (or use fake timers) to stay fast.
  constructor(private readonly delayMs: number = 1000) {}

  async run(selection: AreaSelection): Promise<AnalysisResult> {
    await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    return {
      id: `stub:${selection.source}:${selection.srcId ?? selection.name}`,
    };
  }
}
