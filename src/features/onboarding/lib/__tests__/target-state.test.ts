import { describe, expect, it } from "vitest";

import {
  nextTargetState,
  targetStateForStep,
  type MeasuredTargetState,
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
      missingSince: 1_000,
    };
    expect(targetStateForStep(stored, "tour:explanation")).toEqual({
      rect,
      found: false,
      missingSince: null,
    });
  });

  it("passes the state through for the step it was measured for", () => {
    const stored: MeasuredTargetState = {
      stepKey: "tour:a",
      rect,
      found: true,
      missingSince: null,
    };
    expect(targetStateForStep(stored, "tour:a")).toBe(stored);
  });
});

describe("nextTargetState", () => {
  const found: MeasuredTargetState = {
    stepKey: "tour:a",
    rect,
    found: true,
    missingSince: null,
  };

  it("counts a new step's missing target from that step's start", () => {
    const next = nextTargetState(
      { ...found, stepKey: "tour:old", found: false, missingSince: 5 },
      {
        stepKey: "tour:a",
        rect: null,
        hasTarget: true,
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
      startedAt: 0,
      now: 7_000,
    });
    expect(next).toEqual({
      stepKey: "tour:a",
      rect: null,
      found: false,
      missingSince: 7_000,
    });
  });

  it("keeps the same state while nothing changes, so nothing re-renders", () => {
    expect(
      nextTargetState(found, {
        stepKey: "tour:a",
        rect: { ...rect },
        hasTarget: true,
        startedAt: 0,
        now: 1,
      })
    ).toBe(found);
    const missing = nextTargetState(found, {
      stepKey: "tour:a",
      rect: null,
      hasTarget: true,
      startedAt: 0,
      now: 7_000,
    });
    expect(
      nextTargetState(missing, {
        stepKey: "tour:a",
        rect: null,
        hasTarget: true,
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
      startedAt: 0,
      now: 1,
    });
    expect(next).toEqual({
      stepKey: "tour:done",
      rect: null,
      found: false,
      missingSince: null,
    });
  });
});
