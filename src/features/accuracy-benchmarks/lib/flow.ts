import { STAGE_LABELS } from "../model/config";
import type { AttributionKey, BenchmarkPage } from "../model/types";

export interface FlowLeaf {
  readonly key: AttributionKey;
  readonly label: string;
  readonly count: number;
}

export interface FailureFlow {
  /** Questions scored (errors left out). */
  readonly total: number;
  /** Failure leaves in attribution order, empty stages dropped. */
  readonly leaves: readonly FlowLeaf[];
  /** Questions right on at least two of three tries. */
  readonly accurate: number;
}

/**
 * "Where wrong answers go wrong": every scored question flows through the
 * five stages; each failed one peels off at its earliest failing stage.
 */
export function failureFlow(page: BenchmarkPage): FailureFlow {
  const leaves: FlowLeaf[] = page.stages
    .filter((s) => s.firstFailures > 0)
    .map((s) => ({
      key: s.key,
      label: STAGE_LABELS[s.key],
      count: s.firstFailures,
    }));
  if (page.unattributed > 0) {
    leaves.push({
      key: "unattributed",
      label: STAGE_LABELS.unattributed,
      count: page.unattributed,
    });
  }
  const total = page.summary.scored;
  const failed = leaves.reduce((sum, leaf) => sum + leaf.count, 0);
  return { total, leaves, accurate: total - failed };
}
