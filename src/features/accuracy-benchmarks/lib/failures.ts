import { ATTRIBUTION_ORDER, STAGE_LABELS } from "../model/config";
import type { AttributionKey, GroupStats } from "../model/types";
import { share } from "./format";

export interface FailureMode {
  readonly key: AttributionKey;
  readonly label: string;
  readonly count: number;
  /** Of the group's scored questions. */
  readonly share: number | null;
}

/**
 * Where a group's wrong answers first went wrong: the non-empty stages in
 * attribution order. Feeds the failure flow, the mode bars and the
 * "N at stage" sentences.
 */
export function failureBreakdown(stats: GroupStats): FailureMode[] {
  return ATTRIBUTION_ORDER.filter((k) => stats.failureModes[k] > 0).map(
    (key) => ({
      key,
      label: STAGE_LABELS[key],
      count: stats.failureModes[key],
      share: share(stats.failureModes[key], stats.scored),
    })
  );
}

/** "28 at retrieval, 1 at analysis, 7 at explanation". */
export function failurePhrase(stats: GroupStats): string {
  return failureBreakdown(stats)
    .map((m) => `${m.count} at ${m.label.toLowerCase()}`)
    .join(", ");
}
