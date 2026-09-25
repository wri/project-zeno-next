import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
// A span this long filled day by day would be tens of thousands of points;
// past it the axis stays as the data came.
const MAX_FILLED_DAYS = 3660;
// Up to about half a year a tick names the day; beyond, the month.
const DAY_TICK_MAX_SPAN = 183;

/** True when every row's `key` is a `YYYY-MM-DD` day, e.g. `alert_date`. */
export function isDailyAxis(rows: Record<string, unknown>[], key: string) {
  return (
    rows.length > 0 &&
    rows.every((row) => {
      const value = row[key];
      return typeof value === "string" && ISO_DAY.test(value);
    })
  );
}

/**
 * The rows with a bare `{[key]: day}` row inserted for every day between the
 * first and last that has none, so a categorical axis spaces days evenly
 * instead of closing up quiet stretches. The inserted rows carry no values:
 * a day the data omits stays unreported, never becomes a zero.
 *
 * Rows must already be in day order, as the daily generators emit them.
 */
export function fillMissingDays<T extends Record<string, unknown>>(
  rows: T[],
  key: string
): T[] {
  if (rows.length < 2) return rows;
  const first = parseISO(rows[0][key] as string);
  const span = differenceInCalendarDays(
    parseISO(rows[rows.length - 1][key] as string),
    first
  );
  if (span <= 0 || span > MAX_FILLED_DAYS || span + 1 === rows.length) {
    return rows;
  }

  const byDay = new Map(rows.map((row) => [row[key] as string, row]));
  const filled: T[] = [];
  for (let i = 0; i <= span; i++) {
    const day = format(addDays(first, i), "yyyy-MM-dd");
    filled.push(byDay.get(day) ?? ({ [key]: day } as T));
  }
  return filled;
}

/** Days between the first and last row, for picking a tick format. */
export function dailySpan(rows: Record<string, unknown>[], key: string) {
  if (rows.length < 2) return 0;
  return differenceInCalendarDays(
    parseISO(rows[rows.length - 1][key] as string),
    parseISO(rows[0][key] as string)
  );
}

/** "2026-09-11" as "11 Sep" over a short span, "Sep 2026" over a long one. */
export function formatDayTick(value: string | number, spanDays: number) {
  const day = parseISO(String(value));
  if (Number.isNaN(day.getTime())) return String(value);
  return format(day, spanDays <= DAY_TICK_MAX_SPAN ? "d MMM" : "MMM yyyy");
}
