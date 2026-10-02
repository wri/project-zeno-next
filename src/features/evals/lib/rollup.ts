/**
 * Quality-rate rollup, ported from gnw-gold-evals
 * `tools/challenge_rollup.py::rollup_run`. Semantics:
 *
 * - rate = majority-verdict pass rate over rows actually measured
 *   (verdict pass or fail);
 * - strict rate additionally requires every trial of every gating check to
 *   have passed;
 * - errors are availability, not quality: errored rows leave the
 *   denominator entirely;
 * - uncovered rows and stale rows (uid no longer in the store) are
 *   reported, never counted;
 * - hierarchy: set -> cohort (group) -> difficulty (unlabelled when the
 *   case notes carry none).
 */

import type {
  CaseIndexEntry,
  CaseRow,
  FailingRow,
  RateStat,
  RunRollup,
  SetRollup,
  VerdictCounts,
} from "../model/types";
import { isInfoOnly } from "./checks";
import { wilson } from "./stats";
import { rowVerdict, strictClean } from "./verdict";

interface MutableStat {
  n: number;
  passed: number;
  strictPassed: number;
}

function newStat(): MutableStat {
  return { n: 0, passed: 0, strictPassed: 0 };
}

function finish(stat: MutableStat): RateStat {
  const { n, passed, strictPassed } = stat;
  const { low, high } = wilson(passed, n);
  return {
    n,
    passed,
    strictPassed,
    rate: n ? passed / n : null,
    ciLow: low,
    ciHigh: high,
    strictRate: n ? strictPassed / n : null,
  };
}

function sortedRecord<T>(entries: Map<string, T>): Record<string, T> {
  return Object.fromEntries(
    [...entries.entries()].sort(([a], [b]) => a.localeCompare(b))
  );
}

/** Roll one run's rows up against the current case store (uid-keyed). */
export function rollupRun(
  rows: CaseRow[],
  casesByUid: ReadonlyMap<string, CaseIndexEntry>
): RunRollup {
  const verdicts: VerdictCounts = { pass: 0, fail: 0, error: 0, uncovered: 0 };
  const stale: string[] = [];
  const errored: { id: string; error: string }[] = [];
  const uncovered: string[] = [];
  const overall = newStat();
  const sets = new Map<
    string,
    {
      stat: MutableStat;
      byGroup: Map<string, MutableStat>;
      byDifficulty: Map<string, MutableStat>;
    }
  >();
  const failing: FailingRow[] = [];
  const measuredUids = new Set<string>();

  for (const row of rows) {
    const caseEntry = casesByUid.get(row.uid);
    if (!caseEntry || row.staleCase) {
      stale.push(row.id || row.uid);
      continue;
    }
    measuredUids.add(row.uid);
    const verdict = rowVerdict(row);
    verdicts[verdict] += 1;
    if (verdict === "error") {
      errored.push({ id: caseEntry.id, error: row.error ?? "judge_errors" });
      continue;
    }
    if (verdict === "uncovered") {
      uncovered.push(caseEntry.id);
      continue;
    }
    const caseSet = caseEntry.set || "unset";
    const difficulty = caseEntry.difficulty || "unlabelled";
    const passed = verdict === "pass";
    const strict = strictClean(row);
    let bucket = sets.get(caseSet);
    if (!bucket) {
      bucket = { stat: newStat(), byGroup: new Map(), byDifficulty: new Map() };
      sets.set(caseSet, bucket);
    }
    let groupStat = bucket.byGroup.get(caseEntry.group);
    if (!groupStat) {
      groupStat = newStat();
      bucket.byGroup.set(caseEntry.group, groupStat);
    }
    let difficultyStat = bucket.byDifficulty.get(difficulty);
    if (!difficultyStat) {
      difficultyStat = newStat();
      bucket.byDifficulty.set(difficulty, difficultyStat);
    }
    for (const stat of [overall, bucket.stat, groupStat, difficultyStat]) {
      stat.n += 1;
      if (passed) stat.passed += 1;
      if (strict) stat.strictPassed += 1;
    }
    if (!passed) {
      failing.push({
        id: caseEntry.id,
        set: caseSet,
        group: caseEntry.group,
        difficulty,
        failedChecks: Object.entries(row.checks)
          .filter(([name, value]) => value === 0 && !isInfoOnly(name))
          .map(([name]) => name)
          .sort(),
      });
    }
  }

  const notRun = [...casesByUid.entries()]
    .filter(
      ([uid, caseEntry]) =>
        !measuredUids.has(uid) && caseEntry.status.toLowerCase() !== "not doing"
    )
    .map(([, caseEntry]) => caseEntry.id)
    .sort();

  const nonStale = rows.length - stale.length;
  return {
    verdicts,
    availability: nonStale ? (nonStale - verdicts.error) / nonStale : null,
    stale: [...stale].sort(),
    errored: [...errored].sort((a, b) => a.id.localeCompare(b.id)),
    uncovered: [...uncovered].sort(),
    notRun,
    overall: finish(overall),
    bySet: sortedRecord(
      new Map(
        [...sets.entries()].map(([name, bucket]) => {
          const setRollup: SetRollup = {
            ...finish(bucket.stat),
            byGroup: sortedRecord(
              new Map(
                [...bucket.byGroup.entries()].map(([k, v]) => [k, finish(v)])
              )
            ),
            byDifficulty: sortedRecord(
              new Map(
                [...bucket.byDifficulty.entries()].map(([k, v]) => [
                  k,
                  finish(v),
                ])
              )
            ),
          };
          return [name, setRollup];
        })
      )
    ),
    failing: [...failing].sort((a, b) => a.id.localeCompare(b.id)),
  };
}
