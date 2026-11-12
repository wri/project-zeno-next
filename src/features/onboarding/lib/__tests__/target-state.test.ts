import { describe, expect, it } from "vitest";

import {
  HOLD_PREVIOUS_MS,
  litAnchor,
  nextTargetState,
  popoverReady,
  targetStateForStep,
  unmeasuredTargetState,
  type MeasuredTargetState,
  type TargetMeasurement,
} from "../target-state";

const rect = { x: 10, y: 20, width: 100, height: 40 };
const other = { x: 300, y: 20, width: 100, height: 40 };

describe("targetStateForStep", () => {
  it("hands a new step a fresh state, keeping only the rect to glide from", () => {
    // The previous step looked for its target for a long time.
    const stored: MeasuredTargetState = {
      stepKey: "tour:analysis-card",
      rect,
      found: false,
      onFallback: false,
      missingSince: 1_000,
      holding: false,
    };
    expect(targetStateForStep(stored, "tour:explanation")).toEqual({
      rect,
      found: false,
      onFallback: false,
      missingSince: null,
      holding: true,
    });
  });

  it("passes the state through for the step it was measured for", () => {
    const stored: MeasuredTargetState = {
      stepKey: "tour:a",
      rect,
      found: true,
      onFallback: false,
      missingSince: null,
      holding: false,
    };
    expect(targetStateForStep(stored, "tour:a")).toBe(stored);
  });
});

describe("nextTargetState", () => {
  const found: MeasuredTargetState = {
    stepKey: "tour:a",
    rect,
    found: true,
    onFallback: false,
    missingSince: null,
    holding: false,
  };

  it("counts a new step's missing target from that step's start", () => {
    const next = nextTargetState(
      { ...found, stepKey: "tour:old", found: false, missingSince: 5 },
      {
        stepKey: "tour:a",
        rect: null,
        hasTarget: true,
        onFallback: false,
        startedAt: 900,
        now: 950,
      }
    );
    expect(next.missingSince).toBe(900);
    // Still holding the previous spotlight while the new target comes in.
    expect(next.rect).toBe(rect);
    expect(next.stepKey).toBe("tour:a");
  });

  it("counts from the moment a target that was seen goes missing", () => {
    const next = nextTargetState(found, {
      stepKey: "tour:a",
      rect: null,
      hasTarget: true,
      onFallback: false,
      startedAt: 0,
      now: 7_000,
    });
    expect(next).toEqual({
      stepKey: "tour:a",
      rect: null,
      found: false,
      onFallback: false,
      missingSince: 7_000,
      holding: false,
    });
  });

  it("keeps the same state while nothing changes, so nothing re-renders", () => {
    expect(
      nextTargetState(found, {
        stepKey: "tour:a",
        rect: { ...rect },
        hasTarget: true,
        onFallback: false,
        startedAt: 0,
        now: 1,
      })
    ).toBe(found);
    const missing = nextTargetState(found, {
      stepKey: "tour:a",
      rect: null,
      hasTarget: true,
      onFallback: false,
      startedAt: 0,
      now: 7_000,
    });
    expect(
      nextTargetState(missing, {
        stepKey: "tour:a",
        rect: null,
        hasTarget: true,
        onFallback: false,
        startedAt: 0,
        now: 7_080,
      })
    ).toBe(missing);
  });

  it("follows a target that moves", () => {
    expect(
      nextTargetState(found, {
        stepKey: "tour:a",
        rect: other,
        hasTarget: true,
        onFallback: false,
        startedAt: 0,
        now: 1,
      }).rect
    ).toEqual(other);
  });

  it("has nothing missing for a step without a target", () => {
    const next = nextTargetState(found, {
      stepKey: "tour:done",
      rect: null,
      hasTarget: false,
      onFallback: false,
      startedAt: 0,
      now: 1,
    });
    expect(next).toEqual({
      stepKey: "tour:done",
      rect: null,
      found: false,
      onFallback: false,
      missingSince: null,
      holding: false,
    });
  });
});

describe("popoverReady", () => {
  const required = { hasTarget: true, optional: false };
  const optional = { hasTarget: true, optional: true };
  const STEP = "tour:b";
  const STARTED_AT = 1_000;

  /** Replay the hook's polls for step b, `at` ms after it opened. */
  const replay = (
    from: MeasuredTargetState,
    polls: { at: number; rect: TargetMeasurement["rect"] }[],
    hasTarget = true
  ) =>
    polls.reduce<MeasuredTargetState[]>(
      (states, { at, rect: seen }) => [
        ...states,
        nextTargetState(states.at(-1) ?? from, {
          stepKey: STEP,
          rect: seen,
          hasTarget,
          onFallback: false,
          startedAt: STARTED_AT,
          now: STARTED_AT + at,
        }),
      ],
      []
    );

  it("shows a step without a target at once", () => {
    const unmeasured = targetStateForStep(unmeasuredTargetState("x"), STEP);
    expect(
      popoverReady(unmeasured, { hasTarget: false, optional: false })
    ).toBe(true);
  });

  it("waits until the step has measured its target", () => {
    // The render before the first measurement still has step a's state.
    const fromStepA = targetStateForStep(
      {
        stepKey: "tour:a",
        rect,
        found: true,
        onFallback: false,
        missingSince: null,
        holding: false,
      },
      STEP
    );
    expect(popoverReady(fromStepA, required)).toBe(false);
    expect(popoverReady(unmeasuredTargetState(STEP), required)).toBe(false);
  });

  it("shows as soon as the target is found, inside the hold", () => {
    const [state] = replay(unmeasuredTargetState("tour:a"), [
      { at: 0, rect: other },
    ]);
    expect(state.found).toBe(true);
    expect(popoverReady(state, required)).toBe(true);
    expect(popoverReady(state, optional)).toBe(true);
  });

  it("holds while the previous spotlight stays, then shows a required step centred", () => {
    const fromA: MeasuredTargetState = {
      stepKey: "tour:a",
      rect,
      found: true,
      onFallback: false,
      missingSince: null,
      holding: false,
    };
    const [first, beforeEnd, afterEnd] = replay(fromA, [
      { at: 0, rect: null },
      { at: HOLD_PREVIOUS_MS - 1, rect: null },
      { at: HOLD_PREVIOUS_MS, rect: null },
    ]);
    expect(first.rect).toBe(rect);
    expect(popoverReady(first, required)).toBe(false);
    expect(popoverReady(beforeEnd, required)).toBe(false);
    // Centred: the hold is over, so there is no rect to place it beside.
    expect(afterEnd.rect).toBeNull();
    expect(popoverReady(afterEnd, required)).toBe(true);
  });

  it("ends the hold with a new state even when there was no spotlight to hold", () => {
    // The previous step had no target, so the rect is null before and after
    // the hold. The state must still change, or nothing re-renders to show it.
    const fromCentredStep = unmeasuredTargetState("tour:welcome");
    const [first, beforeEnd, afterEnd] = replay(fromCentredStep, [
      { at: 0, rect: null },
      { at: HOLD_PREVIOUS_MS - 1, rect: null },
      { at: HOLD_PREVIOUS_MS, rect: null },
    ]);
    expect(beforeEnd).toBe(first);
    expect(afterEnd).not.toBe(beforeEnd);
    expect(popoverReady(beforeEnd, required)).toBe(false);
    expect(popoverReady(afterEnd, required)).toBe(true);
  });

  it("keeps an optional step hidden while its target is missing", () => {
    const states = replay(unmeasuredTargetState("tour:a"), [
      { at: 0, rect: null },
      { at: HOLD_PREVIOUS_MS, rect: null },
      { at: HOLD_PREVIOUS_MS + 900, rect: null },
      { at: HOLD_PREVIOUS_MS + 980, rect: other },
    ]);
    expect(states.slice(0, 3).map((s) => popoverReady(s, optional))).toEqual([
      false,
      false,
      false,
    ]);
    expect(popoverReady(states[3], optional)).toBe(true);
  });
});

describe("litAnchor", () => {
  it("lights the target whenever it is on screen", () => {
    expect(litAnchor({ target: true, fallback: true })).toBe("target");
    expect(litAnchor({ target: true, fallback: false })).toBe("target");
  });

  it("lights the fallback while the target is not on screen", () => {
    expect(litAnchor({ target: false, fallback: true })).toBe("fallback");
  });

  it("lights nothing when neither is there", () => {
    expect(litAnchor({ target: false, fallback: false })).toBeNull();
  });
});

describe("a step with a fallback", () => {
  const STEP = "guide:dashboard-create";
  const panel = { x: 8, y: 220, width: 408, height: 656 };
  const button = { x: 20, y: 700, width: 380, height: 40 };
  const poll = (
    prev: MeasuredTargetState,
    seen: TargetMeasurement["rect"],
    onFallback: boolean
  ) =>
    nextTargetState(prev, {
      stepKey: STEP,
      rect: seen,
      onFallback,
      hasTarget: true,
      startedAt: 0,
      now: 1,
    });

  it("counts as found on its fallback, so it shows and can be docked", () => {
    const onPanel = poll(unmeasuredTargetState(STEP), panel, true);
    expect(onPanel).toMatchObject({ found: true, onFallback: true });
    expect(popoverReady(onPanel, { hasTarget: true, optional: false })).toBe(
      true
    );
  });

  it("moves to the target as soon as it appears, and back if it goes", () => {
    const onPanel = poll(unmeasuredTargetState(STEP), panel, true);
    const onButton = poll(onPanel, button, false);
    expect(onButton).toMatchObject({
      rect: button,
      found: true,
      onFallback: false,
    });
    expect(poll(onButton, panel, true)).toMatchObject({
      rect: panel,
      onFallback: true,
    });
  });

  it("changes state when only the lit anchor changes, at the same place", () => {
    const onPanel = poll(unmeasuredTargetState(STEP), panel, true);
    expect(poll(onPanel, { ...panel }, false)).not.toBe(onPanel);
    expect(poll(onPanel, { ...panel }, true)).toBe(onPanel);
  });
});
