import type { InsightWidget } from "@/app/types/chat";

/** Stable key for a widget's view state; ids are set by `chartsToWidgets`. */
export function widgetViewKey(widget: InsightWidget): string {
  return widget.id ?? widget.title;
}
