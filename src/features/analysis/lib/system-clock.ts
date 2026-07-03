import type { Clock } from "../model/clock";

/**
 * Driven adapter for timed waiting. Uses the real global timer so tests
 * should inject a faster alternative (e.g. a no-op or fake-timer version).
 */
export class SystemClock implements Clock {
  wait(secs: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new DOMException("Aborted", "AbortError"));
        return;
      }
      const id = setTimeout(resolve, secs * 1000);
      signal?.addEventListener(
        "abort",
        () => {
          clearTimeout(id);
          reject(new DOMException("Aborted", "AbortError"));
        },
        { once: true }
      );
    });
  }
}
