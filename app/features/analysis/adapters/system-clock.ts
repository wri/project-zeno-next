import type { Clock } from "../application/clock";

/**
 * Driven adapter for timed waiting. Uses the real global timer so tests
 * should inject a faster alternative (e.g. a no-op or fake-timer version).
 */
export class SystemClock implements Clock {
  wait(secs: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, secs * 1000));
  }
}
