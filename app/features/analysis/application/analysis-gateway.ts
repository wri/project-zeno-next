import type { AnalysisSelection } from "../domain/analysis-selection";
import type { AnalysisResult } from "../domain/analysis-result";

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
 * Terminal:     the job is done; `resources` carries the result URLs.
 *
 * The adapter reads the raw HTTP `Retry-After` header (seconds) and surfaces it
 * here — the application layer never sees HTTP headers (ADR 0003).
 */
export type PollOutcome =
  | { status: "pending" | "running"; retryAfterSecs: number }
  | { status: "completed"; resources: JobResource[] };

/**
 * Driven port — the only seam the application layer uses to talk to the backend.
 * Expressed in domain terms; all HTTP knowledge lives in the adapter (ADR 0003).
 */
export interface AnalysisGateway {
  /** POST /api/analyze — submits the job and returns its id. */
  submit(selection: AnalysisSelection): Promise<JobRef>;

  /** GET /api/jobs/{id} — returns the current job status. */
  poll(jobId: string): Promise<PollOutcome>;

  /** GET <resourceUrl> — fetches the insight once the job is completed. */
  fetchResult(resourceUrl: string): Promise<AnalysisResult>;
}
