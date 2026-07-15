/**
 * Intent × coarse-topic matrix for the taxonomy heatmap.
 *
 * One aggregation feeds three chart views of the same grid:
 *   - volume:  cell.count (or its share of matrix.total)
 *   - quality: cell success rate vs the grid average (diverging)
 *   - impact:  failures per cell, absolute or in excess of the average
 *
 * Cell membership reuses `dimensionKeys` from the taxonomy module — the same
 * source of truth as the outcome-mix chart — so a cell's drill-down always
 * matches what the cell counted. Topics are multi-tag: a turn appears under
 * each of its coarse topics, so `total` counts intent×topic PAIRS and can
 * exceed the number of substantive turns.
 */

import type { TaggedTrace } from "./taxonomy";
import { dimensionKeys } from "./taxonomy";

/** Minimum resolved outcomes before a cell's success rate is displayable. */
export const MIN_RESOLVED = 15;

export interface IntentTopicCell {
  /** Substantive turns in this intent × topic pair. */
  readonly count: number;
  /** Of those, turns whose outcome could be resolved. */
  readonly resolved: number;
  /** Of the resolved turns, those whose outcome counts as a success. */
  readonly successes: number;
}

export interface IntentTopicMatrix {
  /** Raw intent codes, ordered by turn volume (desc). */
  readonly intents: readonly string[];
  /** Coarse topic labels, ordered by turn volume (desc), Unclassified last. */
  readonly topics: readonly string[];
  /** Cell grid indexed as cells[intentIndex][topicIndex]. */
  readonly cells: ReadonlyArray<ReadonlyArray<IntentTopicCell>>;
  /** Sum of cell counts — intent × topic pair occurrences, not unique turns. */
  readonly total: number;
  readonly maxCount: number;
  /** Success share across all resolved pairs in the grid; null when none. */
  readonly avgSuccessRate: number | null;
}

export interface IntentTopicMatrixOptions {
  /**
   * Resolves a turn's outcome key. Defaults to the raw server `row.outcome`;
   * pass a refined-outcome accessor to score the grid on the refined taxonomy.
   * Turns resolving to null/undefined/"" count toward volume only.
   */
  readonly outcomeOf?: (t: TaggedTrace) => string | null | undefined;
  /** Outcome keys that count as a success (e.g. attempted answers). */
  readonly successKeys: ReadonlySet<string>;
}

const EMPTY_CELL: IntentTopicCell = { count: 0, resolved: 0, successes: 0 };

export function computeIntentTopicMatrix(
  tagged: readonly TaggedTrace[],
  opts: IntentTopicMatrixOptions
): IntentTopicMatrix {
  const { outcomeOf, successKeys } = opts;

  // Turn volume per axis value (a turn counts once per intent / per topic).
  const intentTurns = new Map<string, number>();
  const topicTurns = new Map<string, number>();
  // Pair accumulator keyed "intent|topic". Coarse topic labels can contain
  // "&" and spaces but never "|" (it is the multi-tag separator).
  const pairs = new Map<string, { c: number; r: number; s: number }>();

  for (const t of tagged) {
    const intents = dimensionKeys(t, "intent");
    if (!intents) continue;
    const topics = dimensionKeys(t, "topic") ?? [];
    if (!topics.length) continue;

    const outcome = String((outcomeOf ? outcomeOf(t) : t.row.outcome) ?? "");
    const resolved = outcome ? 1 : 0;
    const success = resolved && successKeys.has(outcome) ? 1 : 0;

    for (const intent of intents) {
      intentTurns.set(intent, (intentTurns.get(intent) ?? 0) + 1);
      for (const topic of topics) {
        const key = `${intent}|${topic}`;
        const acc = pairs.get(key) ?? { c: 0, r: 0, s: 0 };
        pairs.set(key, {
          c: acc.c + 1,
          r: acc.r + resolved,
          s: acc.s + success,
        });
      }
    }
    for (const topic of topics) {
      topicTurns.set(topic, (topicTurns.get(topic) ?? 0) + 1);
    }
  }

  const byVolume =
    (turns: ReadonlyMap<string, number>) => (a: string, b: string) =>
      (turns.get(b) ?? 0) - (turns.get(a) ?? 0) || a.localeCompare(b);

  const intents = [...intentTurns.keys()].sort(byVolume(intentTurns));
  const topics = [...topicTurns.keys()].sort((a, b) => {
    if (a === "Unclassified") return 1;
    if (b === "Unclassified") return -1;
    return byVolume(topicTurns)(a, b);
  });

  let total = 0;
  let maxCount = 0;
  let resolvedSum = 0;
  let successSum = 0;
  const cells = intents.map((intent) =>
    topics.map((topic) => {
      const acc = pairs.get(`${intent}|${topic}`);
      if (!acc) return EMPTY_CELL;
      total += acc.c;
      maxCount = Math.max(maxCount, acc.c);
      resolvedSum += acc.r;
      successSum += acc.s;
      return { count: acc.c, resolved: acc.r, successes: acc.s };
    })
  );

  return {
    intents,
    topics,
    cells,
    total,
    maxCount,
    avgSuccessRate: resolvedSum ? successSum / resolvedSum : null,
  };
}

/**
 * Success share of a cell's resolved turns, or null when the cell has too few
 * resolved outcomes for the rate to be meaningful.
 */
export function cellSuccessRate(
  cell: IntentTopicCell,
  minResolved: number = MIN_RESOLVED
): number | null {
  return cell.resolved >= minResolved ? cell.successes / cell.resolved : null;
}

/** Resolved turns in the cell that did not end in a success. */
export function cellFailures(cell: IntentTopicCell): number {
  return cell.resolved - cell.successes;
}

/**
 * Failures beyond what the grid-average success rate predicts for the cell's
 * resolved volume — the "fixable gap". Zero for cells at or above average.
 */
export function cellExcessFailures(
  cell: IntentTopicCell,
  avgSuccessRate: number | null
): number {
  if (avgSuccessRate === null) return 0;
  return Math.max(0, cell.resolved * avgSuccessRate - cell.successes);
}

/** All tagged turns behind one cell — the drill-down twin of the aggregation. */
export function tracesForIntentTopic(
  tagged: readonly TaggedTrace[],
  intent: string,
  topic: string
): TaggedTrace[] {
  return tagged.filter(
    (t) =>
      (dimensionKeys(t, "intent") ?? []).includes(intent) &&
      (dimensionKeys(t, "topic") ?? []).includes(topic)
  );
}
