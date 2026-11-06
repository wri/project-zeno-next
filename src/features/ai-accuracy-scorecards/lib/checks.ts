import { CHECKS, type CheckInfo } from "../model/checks";
import { STAGE_ORDER } from "../model/config";
import type { Question, StageKey } from "../model/types";

interface CheckGroups {
  /** Scored checks the run's questions use, per step in stage order; a
   * shared check appears under both of its steps. */
  readonly byStage: readonly {
    readonly stage: StageKey;
    readonly checks: readonly CheckInfo[];
  }[];
  /** Checks the run uses that are reported but never decide a verdict. */
  readonly tracked: readonly CheckInfo[];
  /** Checks no question in the run switches on. */
  readonly unused: readonly CheckInfo[];
}

/** Sort the checks for a run: a check is in use when it runs on whatever an
 * answer contains, or when some question sets a field that switches it on. */
export function groupChecks(questions: readonly Question[]): CheckGroups {
  const fields = new Set(
    questions.flatMap((q) =>
      Object.entries(q.expected)
        .filter(([, value]) => value)
        .map(([key]) => key)
    )
  );
  const used = CHECKS.filter(
    (c) => c.switchedOnBy === null || c.switchedOnBy.some((f) => fields.has(f))
  );
  const scored = used.filter((c) => !c.notScored);
  return {
    byStage: STAGE_ORDER.map((stage) => ({
      stage,
      checks: scored.filter((c) => c.stages.includes(stage)),
    })).filter((s) => s.checks.length),
    tracked: used.filter((c) => c.notScored),
    unused: CHECKS.filter((c) => !used.includes(c)),
  };
}
