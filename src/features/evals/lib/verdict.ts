/**
 * Row verdicts, ported from gnw-gold-evals `src/goldset/buckets.py`
 * (row_verdict) and `tools/challenge_rollup.py` (strict_clean).
 */

import type { CaseRow, Verdict } from "../model/types";
import { isInfoOnly } from "./checks";

/**
 * pass | fail | error | uncovered:
 * - a row with an error or judge errors is an error, not a failure;
 * - info-only checks never enter the verdict;
 * - a row with zero evaluated gating checks is uncovered, never a pass.
 */
export function rowVerdict(row: CaseRow): Verdict {
  if (row.error || row.judgeErrors.length > 0) return "error";
  let evaluated = 0;
  let failed = false;
  for (const [name, value] of Object.entries(row.checks)) {
    if (isInfoOnly(name) || value === null) continue;
    evaluated += 1;
    if (value === 0) failed = true;
  }
  if (evaluated === 0) return "uncovered";
  return failed ? "fail" : "pass";
}

/**
 * True when the row passed AND no trial shows a failing gating check —
 * the "clean on every trial" rate. Rows without per-trial data (1-trial
 * runs) fall back to the majority verdict.
 *
 * The Python original iterates `trials.values()`, but ledger `trials` is a
 * list — this port iterates the array (the upstream bug is flagged for a
 * separate fix in gnw-gold-evals).
 */
export function strictClean(row: CaseRow): boolean {
  if (rowVerdict(row) !== "pass") return false;
  for (const trial of row.trials) {
    for (const [name, value] of Object.entries(trial.checks)) {
      if (!isInfoOnly(name) && value === 0) return false;
    }
  }
  return true;
}
