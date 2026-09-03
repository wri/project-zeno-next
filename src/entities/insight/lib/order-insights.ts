import type { InsightWidget } from "@/app/types/chat";

/**
 * The analysis a chart belongs to. `RestAnalysisGateway` ids every chart of one
 * insight `{insightId}-chart-{n}`, so the prefix groups them. Widgets without
 * that shape (rehydrated history, dataset cards) get a key of their own.
 */
function batchKey(widget: InsightWidget, index: number): string {
  const match = widget.id?.match(/^(.+)-chart-\d+$/);
  return match ? `batch:${match[1]}` : `single:${widget.id ?? index}`;
}

/**
 * Pager order for the insight workspace: the most recent analysis first, but
 * the charts *within* an analysis left in the order the backend sent them.
 *
 * The store appends each batch, so a plain reverse puts the newest analysis
 * first — correct across analyses, wrong inside one. An LGMS analysis returns
 * four charts at the same instant, and reversing them buries its lead chart
 * behind the last one the generator happened to emit. Backend `position` is the
 * intended reading order, so it is preserved.
 */
export function orderInsightsForPager(
  insights: InsightWidget[]
): InsightWidget[] {
  const batches: InsightWidget[][] = [];
  const seen = new Map<string, InsightWidget[]>();

  insights.forEach((widget, index) => {
    const key = batchKey(widget, index);
    const existing = seen.get(key);
    if (existing) {
      existing.push(widget);
      return;
    }
    const batch = [widget];
    seen.set(key, batch);
    batches.push(batch);
  });

  return batches.reverse().flat();
}
