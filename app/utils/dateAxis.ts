import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  format,
  parseISO,
  startOfMonth,
} from "date-fns";

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
// A span this long filled day by day would be tens of thousands of points;
// past it the axis stays as the data came.
const MAX_FILLED_DAYS = 3660;

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

type TickStep =
  | { unit: "day"; every: number }
  | { unit: "month"; every: number };

// Finest first. Month steps land on the 1st of a month that is a multiple of
// `every` (Jan/Apr/Jul/Oct for 3), so ticks read as calendar boundaries.
const TICK_STEPS: TickStep[] = [
  { unit: "day", every: 1 },
  { unit: "day", every: 2 },
  { unit: "day", every: 7 },
  { unit: "day", every: 14 },
  { unit: "month", every: 1 },
  { unit: "month", every: 2 },
  { unit: "month", every: 3 },
  { unit: "month", every: 6 },
  { unit: "month", every: 12 },
];

// Clear space between neighbouring labels.
const TICK_GAP_PX = 16;

function stepTicks(first: Date, last: Date, step: TickStep): Date[] {
  const ticks: Date[] = [];
  if (step.unit === "day") {
    for (let d = first; d <= last; d = addDays(d, step.every)) ticks.push(d);
    return ticks;
  }
  let d = startOfMonth(first);
  if (d < first) d = addMonths(d, 1);
  while (d.getMonth() % step.every !== 0) d = addMonths(d, 1);
  for (; d <= last; d = addMonths(d, step.every)) ticks.push(d);
  return ticks;
}

function stepLabels(
  ticks: Date[],
  step: TickStep,
  crossesYear: boolean
): string[] {
  return ticks.map((d, i) => {
    const newYear = i === 0 || d.getFullYear() !== ticks[i - 1].getFullYear();
    // Days name the year only when the axis spans more than one, and then on
    // the first tick and at each change: "1 Dec 2025 … 12 Jan 2026 … 26 Jan".
    if (step.unit === "day")
      return format(d, crossesYear && newYear ? "d MMM yyyy" : "d MMM");
    if (step.every === 12) return format(d, "yyyy");
    // The year rides on the first tick and wherever it changes, so a label
    // is never ambiguous and the rest stay three letters.
    return format(d, newYear ? "MMM yyyy" : "MMM");
  });
}

/**
 * Whether the labels clear each other at `plotWidth`: each tick sits at its
 * day's share of the span, and every neighbouring pair needs half of each
 * label plus the gap between their centres.
 */
function labelsFit(
  ticks: Date[],
  labels: string[],
  first: Date,
  spanDays: number,
  plotWidth: number,
  charPx: number
) {
  if (spanDays <= 0) return labels.length <= 1;
  const x = ticks.map(
    (d) => (differenceInCalendarDays(d, first) / spanDays) * plotWidth
  );
  for (let i = 1; i < ticks.length; i++) {
    const needed =
      ((labels[i - 1].length + labels[i].length) / 2) * charPx + TICK_GAP_PX;
    if (x[i] - x[i - 1] < needed) return false;
  }
  return true;
}

/**
 * Ticks for a daily axis `plotWidth` pixels wide: the finest calendar step
 * whose labels clear each other at `charPx` per character, so a narrow card
 * gets months and a wide one weeks or days. Returns the tick days (as the
 * axis's `YYYY-MM-DD` values) with their labels.
 *
 * A span shorter than any month boundary still gets day steps; if nothing
 * fits, the coarsest step that yields a tick is used rather than none.
 */
export function pickDailyTicks(
  firstDay: string,
  lastDay: string,
  plotWidth: number,
  charPx: number
): { ticks: string[]; labels: Map<string, string> } {
  const first = parseISO(firstDay);
  const last = parseISO(lastDay);
  const spanDays = differenceInCalendarDays(last, first);
  const crossesYear = first.getFullYear() !== last.getFullYear();
  let fallback: { ticks: Date[]; labels: string[] } | null = null;

  for (const step of TICK_STEPS) {
    const ticks = stepTicks(first, last, step);
    if (ticks.length === 0) continue;
    const labels = stepLabels(ticks, step, crossesYear);
    fallback = { ticks, labels };
    if (labelsFit(ticks, labels, first, spanDays, plotWidth, charPx)) break;
  }

  const chosen = fallback ?? {
    ticks: [first],
    labels: [format(first, "d MMM")],
  };
  const days = chosen.ticks.map((d) => format(d, "yyyy-MM-dd"));
  return {
    ticks: days,
    labels: new Map(days.map((day, i) => [day, chosen.labels[i]])),
  };
}
