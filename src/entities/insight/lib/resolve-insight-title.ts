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

/**
 * The first chart's title in position order — the fallback heading every
 * surface uses for an analysis that has no title of its own. Shared so the
 * Analyses panel (`recordToGroup`) and the dashboard grid (`moduleTitle`)
 * cannot drift apart: they agree today only because the insights gateway
 * happens to assign `position` from the array index, which the dashboards API
 * is under no obligation to match.
 *
 * Structurally typed so both the entity's `Chart` and the dashboards API's
 * own chart shape fit without a conversion.
 */
export function firstChartTitle(
  charts: readonly { position: number; title: string }[]
): string {
  const first = [...charts].sort((a, b) => a.position - b.position)[0];
  return first?.title.trim() ?? "";
}
