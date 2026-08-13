import { formatDistanceToNowStrict } from "date-fns";

export function updatedLabel(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime()) || date.getTime() > Date.now()) {
    return "Updated recently";
  }
  return `Updated ${formatDistanceToNowStrict(date, { addSuffix: true })}`;
}

/** How long the header shows the "Created just now" pill instead of "Updated …". */
const JUST_CREATED_WINDOW_MS = 10 * 60 * 1000;

/**
 * How much of the just-created window is left, in ms — 0 for invalid, future,
 * or already-expired timestamps. Callers showing the pill schedule its removal
 * this far in the future. `now` is injectable for tests; real callers omit it.
 */
export function justCreatedMsRemaining(
  isoDate: string,
  now = Date.now()
): number {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return 0;
  const age = now - date.getTime();
  if (age < 0 || age >= JUST_CREATED_WINDOW_MS) return 0;
  return JUST_CREATED_WINDOW_MS - age;
}

/**
 * Whether a dashboard was created recently enough to show the "Created just
 * now" pill (Figma "Dashboard Empty state" frame) instead of the usual
 * updated-label text.
 */
export function wasJustCreated(isoDate: string, now = Date.now()): boolean {
  return justCreatedMsRemaining(isoDate, now) > 0;
}
