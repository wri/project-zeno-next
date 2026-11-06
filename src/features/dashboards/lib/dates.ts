import { format, formatDistanceToNowStrict } from "date-fns";

export function updatedLabel(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime()) || date.getTime() > Date.now()) {
    return "Updated recently";
  }
  return `Updated ${formatDistanceToNowStrict(date, { addSuffix: true })}`;
}

/**
 * The export's dateline. A calendar date, not `updatedLabel`'s relative one:
 * a PDF outlives "3 days ago".
 */
export function updatedOnLabel(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "Updated recently";
  return `Updated ${format(date, "d MMMM yyyy")}`;
}

/** How long the header shows the "Created just now" pill instead of "Updated …". */
const JUST_CREATED_WINDOW_MS = 10 * 60 * 1000;

/**
 * Whether a dashboard was created recently enough to show the "Created just
 * now" pill (Figma "Dashboard Empty state" frame) instead of the usual
 * updated-label text. `now` is injectable for tests; real callers omit it.
 */
export function wasJustCreated(isoDate: string, now = Date.now()): boolean {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return false;
  const age = now - date.getTime();
  return age >= 0 && age < JUST_CREATED_WINDOW_MS;
}
