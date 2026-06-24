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
