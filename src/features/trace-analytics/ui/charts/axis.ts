/** Shared axis helpers for Recharts components. */

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

/** "2026-06-26" → "26 Jun" for compact x-axis ticks (tooltips keep ISO). */
export function formatDateTick(value: unknown): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? ""));
  if (!match) return String(value ?? "");
  return `${Number(match[3])} ${MONTHS[Number(match[2]) - 1]}`;
}
