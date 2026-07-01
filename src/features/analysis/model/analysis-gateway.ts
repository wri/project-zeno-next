import type { AnalysisSelection } from "./analysis-selection";
import type { AnalysisResult } from "./analysis-result";

/** Opaque reference to a submitted analysis job. */
export interface JobRef {
  id: string;
}

/** A single resource produced by a completed job. */
export interface JobResource {
  id: string;
  /** Relative URL — pass directly to `fetchResult`. e.g. "/api/insights/{id}" */
  resourceUrl: string;
  status: string;
}

/**
 * Outcome of a single poll call.
 *
 * Non-terminal: the LRO state machine should retry after `retryAfterSecs`.
 * Terminal:     the job is done; `resources` carries the result references.
 *
 * `retryAfterSecs` is expressed in seconds and comes from the backend's
 * retry guidance — the adapter is responsible for translating that signal
 * into this field; the application layer never sees transport-level details
 * (ADR 0003).
 */
export type PollOutcome =
  | { status: "pending" | "running"; retryAfterSecs: number }
  | { status: "completed"; resources: JobResource[] };

/**
 * Driven port — the only seam the application layer uses to reach the
 * analysis backend. Expressed in domain terms; all transport knowledge
 * lives in the adapter (ADR 0003).
 */
export interface AnalysisGateway {
  /** Submits an analysis job and returns its opaque identifier. */
  submit(selection: AnalysisSelection, signal?: AbortSignal): Promise<JobRef>;

  /** Checks the current status of a previously submitted job. */
  poll(jobId: string, signal?: AbortSignal): Promise<PollOutcome>;

  /** Retrieves the completed analysis result at the given resource reference. */
  fetchResult(
    resourceUrl: string,
    signal?: AbortSignal
  ): Promise<AnalysisResult>;
}
