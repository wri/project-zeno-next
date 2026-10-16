/**
 * Day arithmetic on ISO `YYYY-MM-DD` strings that stays timezone-free.
 * `new Date(iso)` parses as UTC midnight, so reading it back through local
 * getters west of UTC loses a day; everything here goes through `Date.UTC`
 * and the UTC slice of `toISOString`, never a `Date`'s local accessors.
 */

/** An inclusive period of ISO `YYYY-MM-DD` dates. */
export interface DateRange {
  start: string;
  end: string;
}

const DAY_MS = 86_400_000;

function utcMillis(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function toIso(millis: number): string {
  return new Date(millis).toISOString().slice(0, 10);
}

/** `iso` moved by `days` (negative for earlier). */
export function shiftIsoDate(iso: string, days: number): string {
  return toIso(utcMillis(iso) + days * DAY_MS);
}

/** Today as an ISO date in UTC. `now` is injectable for tests. */
export function todayIso(now: number = Date.now()): string {
  return toIso(now);
}
