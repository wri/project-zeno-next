/** Outcome composition per analysed dataset (which datasets fail most). */

import type { TraceRow } from "../../model/types";

export interface DatasetOutcomeMix {
  readonly label: string;
  /** Traces that referenced this dataset. */
  readonly total: number;
  /** Outcome code (ANSWER, ERROR, …) → trace count. */
  readonly counts: Readonly<Record<string, number>>;
}

/**
 * For the topN datasets by trace count, split their traces by outcome.
 * One trace can reference several datasets, so it counts once per dataset.
 */
export function computeOutcomeMixByDataset(
  rows: readonly TraceRow[],
  topN = 10
): DatasetOutcomeMix[] {
  const byDataset = new Map<string, Map<string, number>>();
  for (const row of rows) {
    const outcome = String(row.outcome ?? "").trim();
    if (!outcome) continue;
    for (const part of row.datasetsAnalysed.split(",")) {
      const dataset = part.trim();
      if (!dataset) continue;
      const counts = byDataset.get(dataset) ?? new Map<string, number>();
      counts.set(outcome, (counts.get(outcome) ?? 0) + 1);
      byDataset.set(dataset, counts);
    }
  }

  return [...byDataset.entries()]
    .map(([label, counts]) => ({
      label,
      total: [...counts.values()].reduce((a, b) => a + b, 0),
      counts: Object.fromEntries(counts),
    }))
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label))
    .slice(0, topN);
}
