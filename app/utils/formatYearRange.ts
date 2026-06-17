/**
 * Shared year-range formatting for analysis-parameter chips. Both the insight
 * workspace (AnalysisParamsChips) and the map legend (LayerEntry) surface the
 * same "YEAR(S)" chip; this keeps their parsing and labelling identical.
 */

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
