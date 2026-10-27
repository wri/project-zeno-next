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

/** "2026-10-23T09:44:47Z" -> "23 Oct 2026". */
export function formatDay(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

/**
 * A benchmark version as the page names it: "2026-draft-3" is draft 3 of
 * Benchmark Set 2026; a frozen "2026" has no draft label.
 */
export function parseVersion(
  version: string,
  isDraft: boolean
): { readonly set: string; readonly draftLabel: string | null } {
  const match = /^(\d{4})(?:-draft(?:-(\d+))?)?$/.exec(version);
  const set = match?.[1] ?? version;
  if (!isDraft) return { set, draftLabel: null };
  return { set, draftLabel: match?.[2] ? `draft ${match[2]}` : "draft" };
}
