/**
 * The rules that keep a tour moving: what kind of step this is, when it is
 * passed over, when the user may skip it, and when a missing target gives up.
 * Pure (no React, no DOM), so the store and the overlay share one tested rule
 * and no step can leave the user without a way forward.
 */
import type { TourStep } from "./tour";

/**
 * How long a step that waits on the app (the answer, a chart) waits before it
 * offers Skip step, ms. It keeps waiting after that: the user chooses.
 */
export const APP_WAIT_SKIP_AFTER_MS = 30_000;

/**
 * How long an optional step looks for a missing target before it is passed
 * over, ms. Counted from the latest of: the step opening, the target last
 * being seen, and the step last holding for it (`holdWhile`), so a card that
 * renders just after the answer ends is still found.
 */
export const MISSING_TARGET_GRACE_MS = 2_000;

/**
 *  - `info`: read, then Next.
 *  - `action`: the user does something (`waitFor`); Skip step is always there.
 *  - `app-wait`: waits on the app (`waitFor` + `waitsOnApp`); Skip step after
 *    {@link APP_WAIT_SKIP_AFTER_MS}.
 *  - `answer-card`: shows a card the app is still making (`holdWhile`); waits
 *    while it holds, Skip step after {@link APP_WAIT_SKIP_AFTER_MS}.
 */
export type StepKind = "info" | "action" | "app-wait" | "answer-card";

export function stepKind(step: TourStep<unknown>): StepKind {
  if (step.waitFor) return step.waitsOnApp ? "app-wait" : "action";
  if (step.holdWhile) return "answer-card";
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
  return stepKind(step) === "action" || !!step.skippable || waitedLong;
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

export interface MissingTargetTimes {
  readonly now: number;
  /** When the step started missing its target (opened, or last saw it). */
  readonly missingSince: number;
  /** When the step last held for its target, if it ever did. */
  readonly lastHeldAt: number | null;
  readonly graceMs: number;
}

/** Whether an optional step has looked for its missing target long enough. */
export function missingTargetExpired(times: MissingTargetTimes): boolean {
  const { now, missingSince, lastHeldAt, graceMs } = times;
  return now - Math.max(missingSince, lastHeldAt ?? missingSince) >= graceMs;
}
