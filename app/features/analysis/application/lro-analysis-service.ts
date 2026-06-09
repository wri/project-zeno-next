import type { AnalysisService } from "./analysis-service";
import type { AnalysisGateway } from "./analysis-gateway";
import type { Clock } from "./clock";
import type { AnalysisSelection } from "../domain/analysis-selection";
import type { AnalysisResult } from "../domain/analysis-result";

/** Stop polling once the sum of Retry-After values exceeds this many seconds. */
const DEFAULT_TIMEOUT_SECS = 60;

/**
 * Application service — implements the submit → poll → fetchResult lifecycle
 * (ADR 0001 / ADR 0002). Framework-free: depends only on ports.
 *
 * The polling loop lives here, not in the gateway adapter. The gateway speaks
 * single-step domain intent; this service orchestrates those steps into a
 * complete long-running operation.
 *
 * Termination: the cumulative sum of Retry-After values is tracked. Once it
 * reaches `timeoutSecs` the service throws rather than waiting further.
 */
export class LROAnalysisService implements AnalysisService {
  constructor(
    private readonly gateway: AnalysisGateway,
    private readonly clock: Clock,
    private readonly timeoutSecs: number = DEFAULT_TIMEOUT_SECS
  ) {}

  async run(selection: AnalysisSelection): Promise<AnalysisResult> {
    const job = await this.gateway.submit(selection);
    let waitedSecs = 0;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const outcome = await this.gateway.poll(job.id);

      if (outcome.status === "completed") {
        if (outcome.resources.length === 0) {
          throw new Error(`Job ${job.id} completed with no resources`);
        }

        // Multiple-resource jobs are not yet supported — take the first.
        const result = await this.gateway.fetchResult(
          outcome.resources[0].resourceUrl
        );

        // Enrich with provenance from the selection (the gateway doesn't have
        // this context when fetchResult is called).
        return {
          ...result,
          params: {
            source: selection.area.source,
            srcId: selection.area.srcId,
            subtype: selection.area.subtype,
            name: selection.area.name,
          },
        };
      }

      waitedSecs += outcome.retryAfterSecs;
      if (waitedSecs >= this.timeoutSecs) {
        throw new Error(
          `Job ${job.id} did not complete within ${this.timeoutSecs} s ` +
            `(accumulated ${waitedSecs} s of retry-after guidance)`
        );
      }

      await this.clock.wait(outcome.retryAfterSecs);
    }
  }
}
