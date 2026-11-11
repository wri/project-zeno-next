/**
 * The rules that keep a tour moving: what kind of step this is, when it is
 * passed over, when the user may skip it, when a missing target gives up,
 * and what status the step shows.
 * Pure (no React, no DOM), so the store and the overlay share one tested rule
 * and no step can leave the user without a way forward.
 */
import type { TourStep } from "./tour";

/**
 * How long a step that waits on the app (the answer, a chart) waits before it
 * offers Skip step, ms. It keeps waiting after that: the user chooses.
 */
export const APP_WAIT_SKIP_AFTER_MS = 30_000;

/** Pause after an action is done before the tour moves on, ms. */
export const DEFAULT_ADVANCE_DELAY_MS = 450;

/**
 * A longer pause for actions that change the map (a dataset or an area
 * switched on), so the user sees the result before the next step covers it.
 */
export const SHOW_RESULT_MS = 1_500;

/** How long the step waits, once done, before it moves on. */
export const advanceDelayMs = (step: TourStep<unknown>): number =>
  step.advanceDelayMs ?? DEFAULT_ADVANCE_DELAY_MS;

/**
 * How long an optional step looks for a missing target before it is passed
 * over, ms. Counted from the latest of: the step opening and the target last
 * being seen.
 */
export const MISSING_TARGET_GRACE_MS = 2_000;

/**
 *  - `info`: read, then Next.
 *  - `action`: the user does something (`waitFor`); Skip step is always there.
 *  - `app-wait`: waits on the app (`waitFor` + `waitsOnApp`); Skip step after
 *    {@link APP_WAIT_SKIP_AFTER_MS}.
 */
export type StepKind = "info" | "action" | "app-wait";

export function stepKind(step: TourStep<unknown>): StepKind {
  if (step.waitFor) return step.waitsOnApp ? "app-wait" : "action";
  return "info";
}

/**
 * Whether the step is passed over as it opens (after its `onEnter`): its
 * `skipIf` holds, or it waits on the app, which is already done, and would
 * only move on by itself.
 */
export function passesOverAtEntry(step: TourStep<unknown>): boolean {
  if (step.skipIf?.()) return true;
  const autoAdvance = step.autoAdvance ?? true;
  return !!step.waitsOnApp && autoAdvance && !!step.waitFor?.();
}

/**
 * Whether a waiting step offers Skip step. `waitedLong`: the step has waited
 * {@link APP_WAIT_SKIP_AFTER_MS}.
 */
export function canSkipWhileWaiting(
  step: TourStep<unknown>,
  waitedLong: boolean
): boolean {
  return stepKind(step) === "action" || waitedLong;
}

/**
 * One poll of a step waiting on `waitFor`: pass it over (`skipIf` wins, e.g.
 * the answer it waits for has failed), keep waiting, move on, or show Next.
 */
export type WaitTick = "skip" | "wait" | "advance" | "unlock";

export function waitTick(step: TourStep<unknown>): WaitTick {
  if (step.skipIf?.()) return "skip";
  if (!step.waitFor?.()) return "wait";
  return (step.autoAdvance ?? true) ? "advance" : "unlock";
}

/**
 * What the popover's status bar shows. One at a time, in this order of
 * precedence: `blocked` > `asked` > `failed` > `done` > `slow` > `wait` >
 * `turn` > `none`.
 *  - `blocked`: the user cannot do what the step asks (`blockedIf`).
 *  - `asked`: the assistant asked the user a question back (`askedIf`).
 *  - `failed`: the step failed (`failedIf`).
 *  - `done`: the wait is over; the step moves on soon, or shows Next.
 *  - `slow`, `wait`: a wait on the app, before and after
 *    {@link APP_WAIT_SKIP_AFTER_MS}.
 *  - `turn`: the step waits for the user. The only status that pulses the
 *    highlight ring.
 *  - `none`: nothing to say (an info step).
 */
export type StepStatusTone =
  | "blocked"
  | "asked"
  | "failed"
  | "done"
  | "slow"
  | "wait"
  | "turn"
  | "none";

export interface StepStatusFacts {
  readonly kind: StepKind;
  /** Still waiting for `waitFor`. */
  readonly awaitingAction: boolean;
  /** The step has waited {@link APP_WAIT_SKIP_AFTER_MS}. */
  readonly waitedLong: boolean;
  /** `waitFor` has passed: the step moves on soon, or shows Next. */
  readonly completing: boolean;
  readonly failed: boolean;
  readonly asked: boolean;
  readonly blocked: boolean;
}

export function stepStatusTone(facts: StepStatusFacts): StepStatusTone {
  if (facts.blocked) return "blocked";
  if (facts.asked) return "asked";
  if (facts.failed) return "failed";
  if (facts.completing) return "done";
  if (!facts.awaitingAction) return "none";
  if (facts.kind === "app-wait") return facts.waitedLong ? "slow" : "wait";
  return facts.kind === "action" ? "turn" : "none";
}

/**
 * How long the step after one the tour passed over by itself says so ("We
 * skipped a step."), ms, counted from when its popover shows.
 */
export const SKIPPED_NOTICE_MS = 4_000;

export interface MissingTargetTimes {
  readonly now: number;
  /** When the step started missing its target (opened, or last saw it). */
  readonly missingSince: number;
  readonly graceMs: number;
}

/** Whether an optional step has looked for its missing target long enough. */
export function missingTargetExpired(times: MissingTargetTimes): boolean {
  const { now, missingSince, graceMs } = times;
  return now - missingSince >= graceMs;
}
