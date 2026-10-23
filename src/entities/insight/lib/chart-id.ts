/**
 * A chart's id: `{insightId}-chart-{position}`, the form the backend streams
 * with generate_insights. The REST gateways mint the same id so a live chart
 * and its stored copy are one chart, not two.
 *
 * Code that needs a chart's analysis reads `InsightWidget.insightId`; nothing
 * parses this id.
 */
export function chartId(insightId: string, position: number): string {
  return `${insightId}-chart-${position}`;
}
