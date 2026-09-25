/**
 * The North Star headline: "when a user asks, how often is the reply
 * completely accurate?" A row counts only when every gating check that
 * applied to it passed (the harness's majority verdict); errors are
 * availability, not quality, and leave the denominator (rollup semantics).
 */

import type { HeadlineSource } from "../model/benchmark";
import type {
  CaseIndexEntry,
  CaseRow,
  RateStat,
  RunHeader,
} from "../model/types";
import { caseDatasetIds, caseIntentKey } from "./case-facets";
import { comparabilityKey, isCanonicalChallenge } from "./comparability";
import { rollupRun } from "./rollup";
import { rowVerdict } from "./verdict";

/**
 * Runs the headline may read, oldest first: one comparable series (never
 * mixing environment, profile or trial count), preferring the canonical
 * series when it exists. BENCHMARK admits only runs with enough trials.
 */
export function eligibleRuns<T extends RunHeader>(
  runs: readonly T[],
  source: HeadlineSource
): T[] {
  const pool =
    source.kind === "benchmark"
      ? runs.filter((run) => run.numTrials >= source.minTrials)
      : [...runs];
  const ordered = pool.sort((a, b) => a.started.localeCompare(b.started));
  const canonical = ordered.filter(isCanonicalChallenge);
  const anchor = (canonical.length ? canonical : ordered).at(-1);
  if (!anchor) return [];
  const key = comparabilityKey(anchor);
  return ordered.filter((run) => comparabilityKey(run) === key);
}

/** Rows the source scores: all of them, or a benchmark's frozen uids. */
export function rowsInSource(
  rows: readonly CaseRow[],
  source: HeadlineSource
): CaseRow[] {
  return source.kind === "benchmark"
    ? rows.filter((row) => source.uids.has(row.uid))
    : [...rows];
}

export interface NorthStar {
  stat: RateStat;
  /** Distinct datasets across measured questions (agnostic ones excluded). */
  datasets: number;
  /** Distinct taxonomy intents across measured questions. */
  intents: number;
}

export function northStar({
  rows,
  casesByUid,
  source,
}: {
  rows: readonly CaseRow[];
  casesByUid: ReadonlyMap<string, CaseIndexEntry>;
  source: HeadlineSource;
}): NorthStar {
  const scored = rowsInSource(rows, source);
  const datasets = new Set<string>();
  const intents = new Set<string>();
  for (const row of scored) {
    const entry = casesByUid.get(row.uid);
    const verdict = rowVerdict(row);
    if (!entry || row.staleCase || (verdict !== "pass" && verdict !== "fail"))
      continue;
    caseDatasetIds(entry).forEach((id) => datasets.add(id));
    const intent = caseIntentKey(entry);
    if (intent) intents.add(intent);
  }
  return {
    stat: rollupRun(scored, casesByUid).overall,
    datasets: datasets.size,
    intents: intents.size,
  };
}
