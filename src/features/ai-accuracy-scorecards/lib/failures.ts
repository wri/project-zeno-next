import { ATTRIBUTION_ORDER, STAGE_LABELS, STAGE_ORDER } from "../model/config";
import type {
  AttributionKey,
  Count,
  GroupStats,
  Question,
} from "../model/types";
import { share } from "./format";

/** A count for every attribution key, all zero. */
export function zeroCounts(): Record<AttributionKey, number> {
  return {
    scope: 0,
    retrieval: 0,
    analysis: 0,
    explanation: 0,
    output: 0,
    unattributed: 0,
  };
}

export interface FailureMode {
  readonly key: AttributionKey;
  readonly label: string;
  readonly count: number;
  /** Of the group's scored questions. */
  readonly share: number | null;
}

function modesOf(
  counts: Readonly<Record<AttributionKey, number>>,
  scored: number
): FailureMode[] {
  return ATTRIBUTION_ORDER.filter((k) => counts[k] > 0).map((key) => ({
    key,
    label: STAGE_LABELS[key],
    count: counts[key],
    share: share(counts[key], scored),
  }));
}

/**
 * Where a group's wrong answers first went wrong: the non-empty stages in
 * attribution order. Feeds the mode bars and the "N at stage" sentences.
 */
export function failureBreakdown(stats: GroupStats): FailureMode[] {
  return modesOf(stats.failureModes, stats.scored);
}

/** "28 at retrieval, 1 at analysis, 7 at explanation". */
export function failurePhrase(stats: GroupStats): string {
  return failureBreakdown(stats)
    .map((m) => `${m.count} at ${m.label.toLowerCase()}`)
    .join(", ");
}

/** How many of the tries must be right for a question to count as
 * accurate: all, most, or at least one. */
export const STANDARDS = ["every", "most", "some"] as const;
export type Standard = (typeof STANDARDS)[number];

/** "most" is the run's verdict, which judges each check over the tries
 * (the page data's `majority`); the other two read the tries, as
 * `every_time` and `any_time` do. */
function isAccurate(q: Question, standard: Standard): boolean {
  if (standard === "most") return q.verdict === "pass";
  return standard === "every"
    ? q.trialsRight.every(Boolean)
    : q.trialsRight.some(Boolean);
}

/**
 * The stage a wrong question is counted at. A question that failed on most
 * tries keeps the run's own attribution; one that failed on fewer (right
 * overall, but not every time) counts at the earliest stage among the checks
 * that failed on any try. Either way a question sits at the same stage under
 * every standard, so a stricter standard only adds questions.
 */
function attributionOf(q: Question): AttributionKey {
  if (q.primaryFailure) return q.primaryFailure;
  const failed = new Set(q.failedChecks.map((f) => f.stage));
  return STAGE_ORDER.find((s) => failed.has(s)) ?? "unattributed";
}

/** A stage of the flow, with the question types its failures came from. */
export interface FlowMode extends FailureMode {
  /** Most failures first. */
  readonly types: readonly Count[];
}

export interface FailureFlow {
  readonly scored: number;
  readonly accurate: number;
  /** accurate / scored, alongside each mode's share. */
  readonly accurateShare: number | null;
  /** Wrong questions per attribution key, zero where none. */
  readonly counts: Readonly<Record<AttributionKey, number>>;
  /** The non-empty keys, in attribution order. */
  readonly modes: readonly FlowMode[];
}

/** The failure flow of a run's scored questions under one standard. */
export function failureFlow(
  questions: readonly Question[],
  standard: Standard
): FailureFlow {
  const counts = zeroCounts();
  const types = new Map<AttributionKey, Map<string, Count>>();
  let scored = 0;
  for (const q of questions) {
    if (q.verdict !== "pass" && q.verdict !== "fail") continue;
    scored += 1;
    if (isAccurate(q, standard)) continue;
    const key = attributionOf(q);
    counts[key] += 1;
    const byType = types.get(key) ?? new Map<string, Count>();
    const prev = byType.get(q.type);
    byType.set(q.type, {
      key: q.type,
      label: q.typeLabel,
      count: (prev?.count ?? 0) + 1,
    });
    types.set(key, byType);
  }
  const modes = modesOf(counts, scored).map((m) => ({
    ...m,
    types: [...(types.get(m.key)?.values() ?? [])].sort(
      (a, b) => b.count - a.count
    ),
  }));
  const accurate = scored - modes.reduce((sum, m) => sum + m.count, 0);
  return {
    scored,
    accurate,
    accurateShare: share(accurate, scored),
    counts,
    modes,
  };
}
