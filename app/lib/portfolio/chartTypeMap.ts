import type { InsightWidget } from "@/app/types/chat";
import type { ChartType } from "@/app/types/portfolio";

// Reduce the wider InsightWidget.type set to the three+ chart shapes
// the portfolio prototype renders. Non-chart widget types (table,
// dataset-card) are ineligible for pinning and are filtered upstream.
export function toChartType(widgetType: InsightWidget["type"]): ChartType {
  switch (widgetType) {
    case "line":
      return "line";
    case "pie":
      return "pie";
    case "area":
      return "area";
    case "scatter":
      return "scatter";
    case "bar":
    case "stacked-bar":
    case "grouped-bar":
    default:
      return "bar";
  }
}

export const PINNABLE_WIDGET_TYPES: ReadonlyArray<InsightWidget["type"]> = [
  "bar",
  "stacked-bar",
  "grouped-bar",
  "line",
  "area",
  "pie",
  "scatter",
];

export function isPinnable(widgetType: InsightWidget["type"]): boolean {
  return PINNABLE_WIDGET_TYPES.includes(widgetType);
}
