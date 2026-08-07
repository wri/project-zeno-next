import type { InsightRecord } from "../model/insight-record";

/**
 * The title to show for one of an insight's chart cards. Curated insights
 * carry their own generated `record.title`, which wins so the same title
 * appears wherever the insight is shown. AI-generated insights have none, so
 * the chart's own title is used (legacy per-chart behavior).
 */
export function resolveInsightTitle(
  record: Pick<InsightRecord, "title">,
  chartTitle: string
): string {
  return record.title ?? chartTitle;
}
