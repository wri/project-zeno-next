/**
 * Visual language for the evals dashboard, matched to the Query Accuracy
 * Dashboard design artefact: serif display headings, mono numerals and
 * eyebrows, and a softened categorical palette (desaturated from the
 * trace-analytics hues so large bands read calmly).
 */

export const SERIF_STACK =
  'Georgia, "Iowan Old Style", "Times New Roman", serif';

export const CHART_CHROME = {
  grid: "#E4E7EB",
  axisTick: "#6B7280",
  surface: "#FFFFFF",
  tickFontSize: 11,
} as const;

/** Fixed-order categorical colors for trend series. */
export const SERIES_COLORS = [
  "#0B6BCB",
  "#00A651",
  "#D97D05",
  "#7C3AED",
  "#E23A22",
  "#0891B2",
] as const;

export function seriesColor(index: number): string {
  return SERIES_COLORS[index % SERIES_COLORS.length];
}

export const BUCKET_BAR_COLOR = "#0B6BCB";
export const BUCKET_BAR_MUTED = "#B2B7BD";

/** Accuracy view: pass + primary failure dimensions (scope-first order). */
export const PASS_COLOR = "#2E9B5F";
export const DIMENSION_COLORS: Readonly<Record<string, string>> = {
  scope: "#7B5CB8",
  retrieval: "#C1554D",
  analysis: "#D9A03F",
  explanation: "#4E8AB5",
  output: "#9A5B8F",
  unattributed: "#8A8F98",
};
