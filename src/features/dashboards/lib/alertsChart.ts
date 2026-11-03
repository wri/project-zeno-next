import type { InsightWidget } from "@/app/types/chat";
import { shiftIsoDate, type DateRange } from "@/src/shared/lib/iso-date";

/**
 * The period pills of the curated integrated alerts chart in a Near
 * real-time monitoring section (PZB-1566): the last 30 days, 2 weeks or week
 * to the latest alert date, or the user's own dates within the chart's
 * period. The backend stores a row for every day of the section's period
 * (the 30 days to the latest alert date, the quiet days with no values), so
 * the chart's first and last rows are that period, and a pill trims the
 * stored rows without a new request.
 *
 * Every date is an ISO `YYYY-MM-DD` string, compared lexicographically, as
 * in `alertsWidgets`.
 */

export type AlertsChartPill =
  | "last-30-days"
  | "last-2-weeks"
  | "last-week"
  | "custom";

/** The preset pills in the toolbar's order, each the days it covers to the latest alert date, both ends counted. Custom follows them. */
export const ALERTS_CHART_PRESETS: {
  value: Exclude<AlertsChartPill, "custom">;
  label: string;
  days: number;
}[] = [
  { value: "last-30-days", label: "Last 30 days", days: 30 },
  { value: "last-2-weeks", label: "Last 2 weeks", days: 14 },
  { value: "last-week", label: "Last week", days: 7 },
];

/** The template whose alerts chart carries the pills (the Analyses pane's does not). */
const NRT_MONITORING = "nrt-monitoring";
const ALERT_DATE = "alert_date";
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Whether `chart` gets the pills: the daily alerts stacked bar, in a section
 * the Near real-time monitoring template built. An alerts chart from before
 * the stacked bars (a line) keeps its stored period as it is.
 */
export function hasAlertsChartPills(
  chart: InsightWidget,
  sectionTemplate: string | undefined
): boolean {
  return (
    sectionTemplate === NRT_MONITORING &&
    chart.type === "stacked-bar" &&
    chart.xAxis === ALERT_DATE &&
    alertsChartPeriod(chart) !== null
  );
}

/** The days the chart covers, its first and last row; null when its rows are not days. */
export function alertsChartPeriod(chart: InsightWidget): DateRange | null {
  const rows = chart.data;
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const day = (row: unknown) => {
    const value = (row as Record<string, unknown> | null)?.[chart.xAxis];
    return typeof value === "string" && ISO_DAY.test(value) ? value : null;
  };
  const start = day(rows[0]);
  const end = day(rows[rows.length - 1]);
  return start && end ? { start, end } : null;
}

/**
 * The range a pill shows, inside `period`: a preset counts back from the
 * period's last day, the latest alert date; a custom range is clamped into
 * the period and ordered (the whole period until one is given).
 */
export function alertsChartRange(
  pill: AlertsChartPill,
  period: DateRange,
  custom?: DateRange
): DateRange {
  const clamp = (iso: string) =>
    iso < period.start ? period.start : iso > period.end ? period.end : iso;
  if (pill === "custom") {
    const start = clamp(custom?.start ?? period.start);
    const end = clamp(custom?.end ?? period.end);
    return start <= end ? { start, end } : { start: end, end: start };
  }
  const { days } = ALERTS_CHART_PRESETS.find(({ value }) => value === pill)!;
  return {
    start: clamp(shiftIsoDate(period.end, -(days - 1))),
    end: period.end,
  };
}

/**
 * Why a custom range cannot be taken, or nothing when it can: a bound
 * `outside` the period (what a date input reports while a year is still
 * being typed, so it is ignored without comment), or an `inverted` range,
 * its end before its start (which the inputs say so about).
 */
export function periodRangeProblem(
  range: DateRange,
  period: DateRange
): "outside" | "inverted" | undefined {
  const inside = (iso: string) => iso >= period.start && iso <= period.end;
  if (!inside(range.start) || !inside(range.end)) return "outside";
  return range.end < range.start ? "inverted" : undefined;
}

/** The rows whose `xAxis` day is in `range`, quiet days included. */
export function rowsInPeriod(
  rows: unknown,
  xAxis: string,
  range: DateRange
): Record<string, unknown>[] {
  if (!Array.isArray(rows)) return [];
  return (rows as Record<string, unknown>[]).filter((row) => {
    const day = row?.[xAxis];
    return typeof day === "string" && day >= range.start && day <= range.end;
  });
}
