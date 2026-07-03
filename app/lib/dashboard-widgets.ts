import type { InsightWidget } from "@/app/types/chat";
import type { DashboardWidget } from "@/app/schemas/api/dashboards/get";

// Chart types ChartWidget can render (InsightWidget["type"] minus
// "dataset-card", which never comes from the dashboards API).
const CHART_TYPES = new Set([
  "line",
  "bar",
  "table",
  "pie",
  "stacked-bar",
  "grouped-bar",
  "area",
  "scatter",
]);

/**
 * Maps a dashboard insight widget (snake_case REST shape) to the
 * `InsightWidget` consumed by `WidgetMessage` — the streaming counterpart of
 * `generateInsightsTool`. Returns `null` when there is nothing to render
 * (insight hidden from this viewer, or no charts); the caller shows a
 * "not available" placeholder per the API contract.
 *
 * Only the first chart is rendered (MVP). Unknown chart types fall back to
 * "table" so the data stays visible.
 */
export function dashboardWidgetToInsightWidget(
  widget: DashboardWidget
): InsightWidget | null {
  const insight = widget.insight;
  const chart = insight?.charts?.length
    ? [...insight.charts].sort((a, b) => a.position - b.position)[0]
    : undefined;
  if (!insight || !chart) return null;

  const seriesFields = chart.series_fields ?? undefined;
  return {
    id: chart.id,
    type: CHART_TYPES.has(chart.chart_type)
      ? (chart.chart_type as InsightWidget["type"])
      : "table",
    title: widget.config?.title ?? chart.title,
    description: insight.insight_text ?? "",
    data: chart.chart_data,
    xAxis: chart.x_axis,
    yAxis: chart.y_axis,
    ...(seriesFields?.length ? { seriesFields } : {}),
    insightId: insight.id,
  };
}
