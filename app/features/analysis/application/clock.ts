/**
 * Port for timed waiting. Injected so the application layer can be tested
 * with a no-op implementation without touching global timers.
 */
export interface Clock {
  /**
   * Wait for the given number of seconds before resolving.
   * If `signal` is aborted before the wait completes, the promise rejects
   * with a `DOMException` whose `name` is `"AbortError"`.
   */
  wait(secs: number, signal?: AbortSignal): Promise<void>;
}
