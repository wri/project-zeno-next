/**
 * Application-specific error thrown by any analysis adapter.
 * Carries a user-facing `message` that is safe to display in the UI, while
 * adapter-level diagnostic context (status, url, method) is kept on the error
 * so callers can log it without leaking infrastructure details to the user.
 */
export class AnalysisError extends Error {
  readonly status: number | undefined;
  readonly url: string | undefined;
  readonly method: string | undefined;

  constructor(
    message: string,
    options?: {
      status?: number;
      url?: string;
      method?: string;
      cause?: unknown;
    }
  ) {
    super(message, { cause: options?.cause });
    this.name = "AnalysisError";
    this.status = options?.status;
    this.url = options?.url;
    this.method = options?.method;
  }
}

/**
 * The analysis job itself reached the terminal `failed` status — the backend
 * accepted and ran it, but could not produce a result for this area/dataset
 * (typically its upstream analytics call gave up). Distinct from
 * `AnalysisError` (a transport/HTTP failure) so callers can show "not
 * available for this area" rather than "something went wrong". The backend
 * exposes no failure text, so there is nothing more specific to carry.
 */
export class AnalysisJobFailedError extends Error {
  readonly jobId: string;

  constructor(jobId: string) {
    super("This analysis is not available for the selected area right now.");
    this.name = "AnalysisJobFailedError";
    this.jobId = jobId;
  }
}
