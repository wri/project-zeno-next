import type { Chart } from "../model/chart";
import type { AnalysisParams, InsightWidget } from "@/app/types/chat";
import { pickChartColors } from "@/app/utils/pickChartColors";

const ALLOWED_TYPES = new Set<InsightWidget["type"]>([
  "line",
  "bar",
  "table",
  "dataset-card",
  "pie",
  "stacked-bar",
  "grouped-bar",
  "area",
  "scatter",
]);

/**
 * Presentation ACL: maps insight charts to the shared `InsightWidget` view model.
 *
 * The single convergence point for every insight acquisition path — the direct
 * analysis LRO and the browse/history list both map through here, never at the
 * transport (ADR 0008). `analysisParams`, when supplied, is attached to every
 * widget in the batch.
 *
 * Unknown chart types fall back to "bar" so a bad type never blanks the widget.
 *
 * The registry color fields are carried through — they drive ChartWidget's
 * backend-color precedence (see formatCharts.tsx).
 */
export function chartsToWidgets(
  charts: Chart[],
  analysisParams?: AnalysisParams
): InsightWidget[] {
  return charts.map((chart) => ({
    id: chart.id,
    type: ALLOWED_TYPES.has(chart.type as InsightWidget["type"])
      ? (chart.type as InsightWidget["type"])
      : "bar",
    title: chart.title,
    description: "",
    data: chart.data,
    xAxis: chart.xAxis,
    yAxis: chart.yAxis,
    seriesFields: chart.seriesFields,
    analysisParams,
    ...pickChartColors(chart),
  }));
}
