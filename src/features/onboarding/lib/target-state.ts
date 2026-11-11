import type { Rect } from "../model/tour";
import { sameRect } from "./geometry";

/**
 * How long the previous step's spotlight stays put while the next target
 * appears (a panel sliding in, a card rendering), so the veil glides from one
 * target to the next instead of flashing to full cover in between.
 */
const HOLD_PREVIOUS_MS = 600;

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
    : { rect: stored.rect, found: false, missingSince: null };
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
      : { stepKey: m.stepKey, rect: m.rect, found: true, missingSince: null };
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
  };
  return sameStep &&
    !prev.found &&
    prev.rect === next.rect &&
    prev.missingSince === next.missingSince
    ? stored
    : next;
}
