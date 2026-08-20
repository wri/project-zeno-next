import type {
  AnalysisGateway,
  JobRef,
  JobResource,
  PollOutcome,
} from "../model/analysis-gateway";
import type { AnalysisSelection } from "../model/analysis-selection";
import type { AnalysisResult } from "../model/analysis-result";

const MOCK_JOB_PREFIX = "mock-dataset-override";

/**
 * Decorator over a real `AnalysisGateway`: for dataset ids present in
 * `overrides`, short-circuits the whole submit -> poll -> fetchResult cycle
 * and resolves immediately with the supplied canned `AnalysisResult`,
 * skipping the network entirely. Every other dataset id passes straight
 * through to the wrapped gateway, untouched.
 *
 * Temporary WIP-backend shim — delete an override entry (and this class, if
 * it ends up unused) once the real backend ships a chart generator for the
 * dataset in question. See `src/features/net-flux` for the current use.
 */
export class DatasetOverrideGateway implements AnalysisGateway {
  private readonly pending = new Map<string, AnalysisResult>();
  private counter = 0;

  constructor(
    private readonly real: AnalysisGateway,
    private readonly overrides: Record<number, AnalysisResult>
  ) {}

  async submit(
    selection: AnalysisSelection,
    signal?: AbortSignal
  ): Promise<JobRef> {
    const override = this.overrides[selection.dataset.id];
    if (!override) return this.real.submit(selection, signal);

    const id = `${MOCK_JOB_PREFIX}-${selection.dataset.id}-${this.counter++}`;
    this.pending.set(id, override);
    return { id };
  }

  async poll(jobId: string, signal?: AbortSignal): Promise<PollOutcome> {
    if (!this.pending.has(jobId)) return this.real.poll(jobId, signal);

    const resource: JobResource = {
      id: jobId,
      resourceUrl: jobId,
      status: "completed",
    };
    return { status: "completed", resources: [resource] };
  }

  async fetchResult(
    resourceUrl: string,
    signal?: AbortSignal
  ): Promise<AnalysisResult> {
    const override = this.pending.get(resourceUrl);
    if (!override) return this.real.fetchResult(resourceUrl, signal);

    this.pending.delete(resourceUrl);
    return override;
  }
}
