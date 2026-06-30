import type { InsightWidget } from "@/app/types/chat";

// Shared search + chart-type filtering for the analyses lists (the map's
// AnalysesPane and the dashboards' DashboardInsightsPanel). Only fields that
// are reliably present on every insight — including the ~hundreds fetched from
// GET /api/insights — are used: title, summary text and chart type. Dataset and
// area are NOT in that payload, so they're intentionally not filterable here.

/** The chart-type families we expose as filters (variants collapse into one). */
export type ChartFamily = "line" | "bar" | "pie" | "table" | "scatter";

export const CHART_FAMILY_LABEL: Record<ChartFamily, string> = {
  line: "Line",
  bar: "Bar",
  pie: "Pie",
  table: "Table",
  scatter: "Scatter",
};

const FAMILY_ORDER: ChartFamily[] = ["line", "bar", "pie", "table", "scatter"];

/** Map a chart type onto its filter family (null for unknown / dataset-card). */
export function chartFamily(type: InsightWidget["type"]): ChartFamily | null {
  switch (type) {
    case "line":
    case "area":
      return "line";
    case "bar":
    case "stacked-bar":
    case "grouped-bar":
      return "bar";
    case "pie":
      return "pie";
    case "table":
      return "table";
    case "scatter":
      return "scatter";
    default:
      return null;
  }
}

/** Case-insensitive match across title, summary and (when present) dataset. */
export function matchesQuery(insight: InsightWidget, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    insight.title.toLowerCase().includes(q) ||
    (insight.description?.toLowerCase().includes(q) ?? false) ||
    (insight.datasetName?.toLowerCase().includes(q) ?? false)
  );
}

/** Filter entries (anything carrying an `insight`) by query + chart family. */
export function filterInsightEntries<T extends { insight: InsightWidget }>(
  entries: T[],
  query: string,
  family: ChartFamily | "all"
): T[] {
  return entries.filter(
    (e) =>
      matchesQuery(e.insight, query) &&
      (family === "all" || chartFamily(e.insight.type) === family)
  );
}

/** Distinct chart families present in a list, in canonical order — used to
 *  render only the type chips that would actually match something. */
export function presentFamilies(insights: InsightWidget[]): ChartFamily[] {
  const present = new Set<ChartFamily>();
  for (const i of insights) {
    const f = chartFamily(i.type);
    if (f) present.add(f);
  }
  return FAMILY_ORDER.filter((f) => present.has(f));
}
