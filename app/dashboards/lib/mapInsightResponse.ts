import type { InsightWidget, CodeActPart } from "@/app/types/chat";
import type {
  InsightResponse,
  ListInsightsResponse,
} from "@/app/schemas/api/insights/get";

const WIDGET_TYPES = new Set<string>([
  "line",
  "bar",
  "table",
  "pie",
  "stacked-bar",
  "grouped-bar",
  "area",
  "scatter",
]);

// The backend emits exactly the InsightWidget union for chart_type
// (analyst/code_executors/base.py), but clamp defensively so an unexpected
// value renders as a bar rather than breaking the chart picker.
function toWidgetType(chartType: string): InsightWidget["type"] {
  return WIDGET_TYPES.has(chartType)
    ? (chartType as InsightWidget["type"])
    : "bar";
}

/**
 * Flatten a persisted insight (one insight -> many charts) into the flat
 * InsightWidget shape the dashboards UI renders. This is the REST equivalent of
 * what generateInsights.ts does for the live SSE stream. The REST payload has
 * no per-chart description (only the insight-level insight_text) and no
 * source_urls, so description maps to insight_text and generation carries only
 * codeact_parts.
 */
export function mapInsightResponseToWidgets(
  insight: InsightResponse
): InsightWidget[] {
  const codeact_parts = insight.codeact_parts as CodeActPart[];
  return insight.charts.map((chart) => ({
    id: chart.id,
    type: toWidgetType(chart.chart_type),
    title: chart.title,
    description: insight.insight_text,
    data: chart.chart_data,
    xAxis: chart.x_axis,
    yAxis: chart.y_axis,
    ...(chart.series_fields.length > 0
      ? { seriesFields: chart.series_fields }
      : {}),
    generation: { codeact_parts },
  }));
}

export function mapInsightsResponse(
  insights: ListInsightsResponse
): InsightWidget[] {
  return insights.flatMap(mapInsightResponseToWidgets);
}
