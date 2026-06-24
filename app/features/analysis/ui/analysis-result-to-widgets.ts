import type { AnalysisResult } from "../domain/analysis-result";
import type { InsightWidget } from "@/app/types/chat";

/**
 * Presentation ACL: maps an analysis result to the shared InsightWidget view model.
 *
 * Two acquisition paths — chat/agent stream and analysis LRO — converge at this
 * function, never at the transport. (ADR 0008)
 *
 * Ignored fields: insightText, followUpSuggestions, codeactParts (empty in current API).
 * colorField, stackField, groupField not yet used by InsightWidget rendering.
 */
export function analysisResultToWidgets(
  result: AnalysisResult
): InsightWidget[] {
  return result.charts.map((chart) => ({
    id: chart.id,
    type: (chart.type as InsightWidget["type"]) ?? "bar",
    title: chart.title,
    description: "",
    data: chart.data,
    xAxis: chart.xAxis,
    yAxis: chart.yAxis,
    seriesFields: chart.seriesFields,
    analysisParams: result.params ? { areas: [result.params.name] } : undefined,
  }));
}
