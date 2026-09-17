/**
 * Run comparability and the canonical/diagnostic distinction. Mirrors the
 * gnw-gold-evals doctrine: never chart or diff runs with differing ff or
 * trial counts — the profiles differ in capability surface, and two trials
 * of the SAME run differ by 18-29 spurious regressions.
 */

import { CANONICAL_ENV, CANONICAL_TRIALS } from "../model/config";
import type { RunHeader } from "../model/types";

/**
 * Runs sharing this key may sit on one trend line. `caseset_version` is
 * deliberately excluded — it changes with routine case edits and would
 * shred the series; version changes surface in point tooltips instead.
 */
export function comparabilityKey(run: RunHeader): string {
  return [
    run.caseset,
    run.environment,
    run.ff ?? "default",
    `${run.numTrials}`,
  ].join("|");
}

/** Canonical CHALLENGE run: prod, default profile, official trial count. */
export function isCanonicalChallenge(run: RunHeader): boolean {
  return (
    run.caseset === "challenge" &&
    run.environment === CANONICAL_ENV &&
    run.ff === null &&
    run.numTrials >= CANONICAL_TRIALS
  );
}

/** Any non-canonical CHALLENGE run — its rates are directional only. */
export function isDiagnostic(run: RunHeader): boolean {
  return run.caseset === "challenge" && !isCanonicalChallenge(run);
}

/** GOLD's official tier; 1-trial GOLD runs are smoke, never a baseline. */
export function isOfficialGold(run: RunHeader): boolean {
  return run.caseset !== "challenge" && run.numTrials >= CANONICAL_TRIALS;
}

/**
 * The run a headline should quote: the latest official/canonical run,
 * falling back to the latest run of any tier (which the tier badge then
 * marks as smoke/diagnostic).
 */
export function pickHeadlineRun<T extends RunHeader & { started: string }>(
  runs: T[]
): T | null {
  const byStart = (a: T, b: T) => a.started.localeCompare(b.started);
  const official = runs.filter((run) =>
    run.caseset === "challenge"
      ? isCanonicalChallenge(run)
      : isOfficialGold(run)
  );
  return (
    [...official].sort(byStart).at(-1) ?? [...runs].sort(byStart).at(-1) ?? null
  );
}
