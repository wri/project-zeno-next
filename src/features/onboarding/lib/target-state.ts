import type { Rect } from "../model/tour";
import { sameRect } from "./geometry";

/**
 * How long the previous step's spotlight stays put while the next target
 * appears (a panel sliding in, a card rendering), so the veil glides from one
 * target to the next instead of flashing to full cover in between.
 */
export const HOLD_PREVIOUS_MS = 600;

export interface TargetState {
  /** Where the spotlight should be: the target, or briefly the previous one. */
  readonly rect: Rect | null;
  /** Whether `rect` is this step's own target. */
  readonly found: boolean;
  /**
   * Since when this step has been without its target: the step's start, or
   * the moment it last saw it. Null while found, or not measured yet.
   */
  readonly missingSince: number | null;
  /**
   * The target is not found yet and the step is still inside
   * {@link HOLD_PREVIOUS_MS} (or not measured yet): the spotlight holds the
   * previous one. A state of its own, because when the previous step had no
   * target the rect is null either way, and the hold's end must re-render.
   */
  readonly holding: boolean;
}

/** The state as stored: which step it was measured for. */
export interface MeasuredTargetState extends TargetState {
  readonly stepKey: string;
}

/**
 * What a step sees. Until the hook has measured a new step, the stored state
 * is the previous step's; passing that on would tell the new step its own
 * target had been missing all along, and an optional step would be skipped
 * at once. Only the rect carries over, so the spotlight glides.
 */
export function targetStateForStep(
  stored: MeasuredTargetState,
  stepKey: string
): TargetState {
  return stored.stepKey === stepKey
    ? stored
    : { rect: stored.rect, found: false, missingSince: null, holding: true };
}

/** A step's state before its first measurement. */
export const unmeasuredTargetState = (
  stepKey: string
): MeasuredTargetState => ({
  stepKey,
  rect: null,
  found: false,
  missingSince: null,
  holding: true,
});

/**
 * Whether the step's popover may show. It waits for the target, so it never
 * appears beside the previous one and slides across:
 *  - a step without a target, or with its target found: ready;
 *  - during the hold: not ready;
 *  - after the hold, target still missing: a required step shows centred; an
 *    optional one stays hidden until its target appears or it is skipped.
 */
export function popoverReady(
  state: TargetState,
  step: { readonly hasTarget: boolean; readonly optional: boolean }
): boolean {
  if (!step.hasTarget || state.found) return true;
  return !state.holding && !step.optional;
}

export interface TargetMeasurement {
  readonly stepKey: string;
  /** The target's rect on screen, or null when it isn't there. */
  readonly rect: Rect | null;
  /** The step has a target at all. */
  readonly hasTarget: boolean;
  readonly startedAt: number;
  readonly now: number;
}

/**
 * The state after one measurement. Returns `stored` itself when nothing the
 * spotlight shows has changed, so a missing target costs no re-renders.
 */
export function nextTargetState(
  stored: MeasuredTargetState,
  m: TargetMeasurement
): MeasuredTargetState {
  const sameStep = stored.stepKey === m.stepKey;
  const prev = sameStep
    ? stored
    : { ...targetStateForStep(stored, m.stepKey), stepKey: m.stepKey };
  if (m.rect)
    return sameStep && prev.found && sameRect(prev.rect, m.rect)
      ? stored
      : {
          stepKey: m.stepKey,
          rect: m.rect,
          found: true,
          missingSince: null,
          holding: false,
        };
  const holding = m.hasTarget && m.now - m.startedAt < HOLD_PREVIOUS_MS;
  const missingSince = !m.hasTarget
    ? null
    : prev.found
      ? m.now
      : (prev.missingSince ?? m.startedAt);
  const next: MeasuredTargetState = {
    stepKey: m.stepKey,
    rect: holding ? prev.rect : null,
    found: false,
    missingSince,
    holding,
  };
  return sameStep &&
    !prev.found &&
    prev.rect === next.rect &&
    prev.missingSince === next.missingSince &&
    prev.holding === next.holding
    ? stored
    : next;
}
