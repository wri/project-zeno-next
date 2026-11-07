/**
 * Shared date-range formatting for parameter chips. Both the insight workspace
 * (AnalysisParamsChips) and the map legend (LayerEntry) surface the same
 * "YEAR(S)" chip, and the legend and imagery legend share the "DATES" chip;
 * this keeps their parsing, labelling and chip shape identical.
 */
import { format, isValid, parseISO } from "date-fns";

const EN_DASH = "–";

export interface YearParam {
  label: "YEAR" | "YEARS";
  value: string;
}

/** Extract a 4-digit year from a year number or an ISO date string. */
function toYear(value: number | string): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  // Callers pass either year numbers or ISO dates ("YYYY-…"); read the prefix.
  const prefix = value.slice(0, 4);
  return /^\d{4}$/.test(prefix) ? Number(prefix) : null;
}

/**
 * Builds the year chip from a start/end pair given as year numbers or date
 * strings. Equal bounds collapse to a single "YEAR" (e.g. "2020"); differing
 * bounds become a compact "YEARS" range with a 2-digit end year (e.g.
 * "2020–23"). Returns undefined when either bound is missing or unparseable.
 */
export function buildYearParam(
  start: number | string | null | undefined,
  end: number | string | null | undefined
): YearParam | undefined {
  if (start == null || end == null) return undefined;
  const startYear = toYear(start);
  const endYear = toYear(end);
  if (startYear == null || endYear == null) return undefined;
  if (startYear === endYear) {
    return { label: "YEAR", value: String(startYear) };
  }
  // Compact end year to its last two digits: 2020–2023 → "2020–23".
  const endShort = String(endYear).slice(-2);
  return { label: "YEARS", value: `${startYear}${EN_DASH}${endShort}` };
}

interface DatesParam {
  label: "DATES";
  value: string;
  maxValueWidth: string;
}

/** The DATES chip around an already-formatted date range. */
export function buildDatesParam(value: string): DatesParam {
  return {
    label: "DATES",
    value,
    // Wide enough for a cross-year range ("Dec 28, 2025 – Jan 4, 2026"); the
    // default 15ch would hide the end date behind an ellipsis.
    maxValueWidth: "26ch",
  };
}

/**
 * Compact date range for a DATES chip, e.g. "May 28 – Jun 3, 2026". The start
 * year is left out within one year, so the chip fits the dashboard legend's
 * 300px width. Undefined when a bound is not an ISO date.
 */
export function formatDateRange(
  startIso: string,
  endIso: string
): string | undefined {
  const start = parseISO(startIso);
  const end = parseISO(endIso);
  if (!isValid(start) || !isValid(end)) return undefined;
  const startLabel =
    start.getFullYear() === end.getFullYear()
      ? format(start, "MMM d")
      : format(start, "MMM d, yyyy");
  return `${startLabel} ${EN_DASH} ${format(end, "MMM d, yyyy")}`;
}
