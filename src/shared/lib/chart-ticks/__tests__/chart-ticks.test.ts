import { describe, expect, it } from "vitest";
import { formatTick, niceStep, niceTicks } from "../chart-ticks";

/**
 * Domain as `GhgFluxTreeChart` computes it: zero is always included, then 4%
 * of the span is added as padding on both ends.
 */
function domain(values: number[]): [number, number] {
  const max = Math.max(0, ...values);
  const min = Math.min(0, ...values);
  const pad = Math.max(max - min, 1) * 0.04;
  return [min - pad, max + pad];
}

describe("niceStep", () => {
  it("rounds up to the 1/2/2.5/5/10 ladder", () => {
    expect(niceStep(1)).toBe(1);
    expect(niceStep(3)).toBe(5);
    expect(niceStep(2.1)).toBe(2.5);
    expect(niceStep(430)).toBe(500);
    expect(niceStep(507.6)).toBe(1000);
  });

  it("degrades to 1 for a non-positive or non-finite span", () => {
    expect(niceStep(0)).toBe(1);
    expect(niceStep(-5)).toBe(1);
    expect(niceStep(Number.NaN)).toBe(1);
  });
});

describe("niceTicks — the two Figma frames", () => {
  // Every avgEmissions/avgRemovals the gross view draws, per
  // "AA · Gross — full view (degradation)".
  const GROSS = [
    1600, -750, 1350, -750, 530, -710, 400, -560, 100, -140, 30, -10, 820, -40,
    130, -40, 690, 250, 150, 100,
  ];
  // One net value per row, per the Net frames (1628-6011 / 1628-5110).
  const NET = [850, 600, -180, 400, -560, -40, 20, 780, 90, 690, 250, 150, 100];

  it("reproduces the gross frame's -500 0 500 1000 1500", () => {
    expect(niceTicks(domain(GROSS))).toEqual([-500, 0, 500, 1000, 1500]);
  });

  it("reproduces the net frame's -500 0 500", () => {
    expect(niceTicks(domain(NET))).toEqual([-500, 0, 500]);
  });
});

describe("niceTicks — invariants across domain shapes", () => {
  const shapes: [string, number[]][] = [
    ["all positive", [1200, 300, 50]],
    ["all negative", [-1400, -200]],
    ["symmetric", [900, -900]],
    ["lopsided", [5000, -50]],
    ["single small row", [100]],
    ["sub-1 megatonnes", [0.8, -0.3]],
    ["tiny", [3, -2]],
  ];

  it.each(shapes)("always labels zero (%s)", (_name, values) => {
    expect(niceTicks(domain(values))).toContain(0);
  });

  it.each(shapes)("stays between 3 and 7 ticks (%s)", (_name, values) => {
    const count = niceTicks(domain(values)).length;
    expect(count).toBeGreaterThanOrEqual(3);
    expect(count).toBeLessThanOrEqual(7);
  });

  it('never emits negative zero, which Intl renders as "-0"', () => {
    // A mostly-positive domain dips just below zero from the 4% padding, so
    // the first tick is reached from below and `Math.round` yields -0.
    const ticks = niceTicks(domain([850]));
    expect(ticks).toContain(0);
    for (const tick of ticks) {
      expect(Object.is(tick, -0)).toBe(false);
    }
    expect(ticks.map(formatTick)).not.toContain("-0");
  });

  it("stays inside the domain it was given", () => {
    const [min, max] = domain([1600, -750]);
    for (const tick of niceTicks([min, max])) {
      expect(tick).toBeGreaterThanOrEqual(min);
      expect(tick).toBeLessThanOrEqual(max);
    }
  });
});

describe("formatTick", () => {
  it("prints plain integers — no compact notation, no separator", () => {
    expect(formatTick(1500)).toBe("1500");
    expect(formatTick(-500)).toBe("-500");
    expect(formatTick(0)).toBe("0");
  });

  it("absorbs the float drift a sub-1 step leaves behind", () => {
    expect(formatTick(0.6000000000000001)).toBe("0.6");
  });
});
