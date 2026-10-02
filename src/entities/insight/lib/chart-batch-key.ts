/**
 * The analysis a chart belongs to. `RestAnalysisGateway` ids every chart of
 * one insight `{insightId}-chart-{n}`, so the prefix groups them. Returns
 * null when the id is absent or doesn't follow that shape (rehydrated
 * history, dataset cards, test fixtures).
 */
export function chartBatchKey(id: string | undefined): string | null {
  const match = id?.match(/^(.+)-chart-\d+$/);
  return match ? match[1] : null;
}
