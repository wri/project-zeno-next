const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

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
  const [year, month] = iso.slice(0, 7).split("-").map(Number);
  return `${MONTHS[month - 1]} ${year}`;
}

/** "2026-10-23T09:44:47Z" -> "23 Oct 2026". */
export function formatDay(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

/**
 * The Benchmark Set a version belongs to: "2026-draft-3" and "2026" are
 * both set 2026. Whether a run is a draft is its release's call
 * (`model/releases.ts`), not the version's.
 */
export function versionSet(version: string): string {
  return /^(\d{4})(?:-draft(?:-\d+)?)?$/.exec(version)?.[1] ?? version;
}
