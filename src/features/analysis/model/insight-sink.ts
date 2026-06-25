import type { InsightWidget } from "@/app/types/chat";

/**
 * Output port: receives the widget representation of a completed analysis so it
 * can be surfaced on the map workspace.
 *
 * Defined here (ui layer) rather than application/ because its vocabulary is
 * `InsightWidget` — a view-model type that belongs to the driving side. The
 * application layer stays clean: it returns an `AnalysisResult` and knows
 * nothing about where widgets land.
 *
 * Injected at the composition root in `useAnalysis` so the hook's run logic
 * has no direct knowledge of which store or surface receives the results.
 */
export interface InsightSink {
  /**
   * Publish widgets to the insight surface. Implementations should treat an
   * empty array as a no-op; callers are not required to guard against it.
   */
  add(widgets: InsightWidget[]): void;
}
