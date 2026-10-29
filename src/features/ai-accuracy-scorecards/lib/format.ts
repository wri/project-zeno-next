import { format, parseISO } from "date-fns";

/**
 * The calendar date an ISO timestamp names in UTC, as a local date: run
 * timestamps are UTC, and formatting only the date part keeps a run near
 * midnight on its own day in every viewer's time zone.
 */
export function calendarDate(iso: string): Date {
  return parseISO(iso.slice(0, 10));
}

/** count / of, or null for an empty group. */
export function share(count: number, of: number): number | null {
  return of ? count / of : null;
}

/** A share in [0, 1] as a percentage; an en dash when there is none. */
export function pct(value: number | null, digits = 0): string {
  return value == null ? "–" : `${(value * 100).toFixed(digits)}%`;
}

/** "2026-10-23T09:44:47Z" -> "Oct 2026". */
export function formatMonth(iso: string): string {
  return format(calendarDate(iso), "MMM yyyy");
}

/** "2026-10-23" -> "October 2026". */
export function formatLongMonth(iso: string): string {
  return format(calendarDate(iso), "MMMM yyyy");
}

/** "2026-10-23" -> "23 October 2026". */
export function formatLongDay(iso: string): string {
  return format(calendarDate(iso), "d MMMM yyyy");
}

/** "2026-10-23T09:44:47Z" -> "23 Oct 2026". */
export function formatDay(iso: string): string {
  return format(calendarDate(iso), "d MMM yyyy");
}

/**
 * The Benchmark Set a version belongs to: "2026-draft-3" and "2026" are
 * both set 2026. Whether a run is a draft is its release's call
 * (`model/releases.ts`), not the version's.
 */
export function versionSet(version: string): string {
  return /^(\d{4})(?:-draft(?:-\d+)?)?$/.exec(version)?.[1] ?? version;
}
