/**
 * Port for timed waiting. Injected so the application layer can be tested
 * with a no-op implementation without touching global timers.
 */
export interface Clock {
  /** Wait for the given number of seconds before resolving. */
  wait(secs: number): Promise<void>;
}
