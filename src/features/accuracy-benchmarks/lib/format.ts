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

/** A share in [0, 1] as a percentage; an en dash when there is none. */
export function pct(share: number | null, digits = 0): string {
  return share == null ? "–" : `${(share * 100).toFixed(digits)}%`;
}

/** "2026-10-23T09:44:47Z" -> "23 Oct 2026". */
export function formatDay(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

/** "2026-draft-3" -> "draft 3"; a frozen version reads as itself. */
export function versionLabel(version: string): string {
  const match = /^(\d{4})-draft(?:-(\d+))?$/.exec(version);
  if (!match) return version;
  return match[2] ? `draft ${match[2]}` : "draft";
}
