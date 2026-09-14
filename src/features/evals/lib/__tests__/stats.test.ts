import { describe, expect, it } from "vitest";
import { wilson } from "../stats";

describe("wilson", () => {
  // Reference values computed with gnw-gold-evals
  // tools/challenge_rollup.py::wilson on the same inputs.
  it("matches the Python implementation on the published comparison run", () => {
    const { low, high } = wilson(119, 144);
    expect(low).toBeCloseTo(0.756264144441322, 12);
    expect(high).toBeCloseTo(0.8795514852596552, 12);
  });

  it("is wide on tiny samples", () => {
    const { low, high } = wilson(4, 5);
    expect(low).toBeCloseTo(0.3755282641185388, 12);
    expect(high).toBeCloseTo(0.9637768390302125, 12);
  });

  it("returns the full interval when nothing was measured", () => {
    expect(wilson(0, 0)).toEqual({ low: 0, high: 1 });
  });

  it("stays clamped to [0, 1]", () => {
    expect(wilson(0, 3).low).toBe(0);
    expect(wilson(3, 3).high).toBeLessThanOrEqual(1);
  });
});
