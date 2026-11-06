import { wait } from "@/src/shared/lib/wait";
import type { Clock } from "../model/clock";

/**
 * Driven adapter for timed waiting. Uses the real global timer so tests
 * should inject a faster alternative (e.g. a no-op or fake-timer version).
 */
export class SystemClock implements Clock {
  wait(secs: number, signal?: AbortSignal): Promise<void> {
    return wait(secs * 1000, signal);
  }
}
