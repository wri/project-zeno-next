import { describe, expect, it } from "vitest";
import {
  percentagePointDelta,
  previousRange,
  relativeDelta,
  withMovingAverage,
} from "../analytics/compare";

describe("previousRange", () => {
  it("returns the equal-length window immediately before", () => {
    expect(
      previousRange({ startDate: "2026-06-08", endDate: "2026-06-14" })
    ).toEqual({
      startDate: "2026-06-01",
      endDate: "2026-06-07",
    });
  });

  it("handles single-day windows", () => {
    expect(
      previousRange({ startDate: "2026-06-10", endDate: "2026-06-10" })
    ).toEqual({
      startDate: "2026-06-09",
      endDate: "2026-06-09",
    });
  });
});

describe("relativeDelta", () => {
  it("formats increases and flags good/bad by direction", () => {
    expect(relativeDelta(110, 100, { upIsGood: true })).toEqual({
      text: "+10.0%",
      direction: "up",
      positive: true,
    });
    expect(relativeDelta(110, 100, { upIsGood: false })?.positive).toBe(false);
    expect(relativeDelta(90, 100, { upIsGood: true })).toEqual({
      text: "-10.0%",
      direction: "down",
      positive: false,
    });
  });

  it("returns null when the previous value is zero (no baseline)", () => {
    expect(relativeDelta(5, 0, { upIsGood: true })).toBeNull();
  });

  it("treats tiny changes as flat", () => {
    expect(relativeDelta(100.01, 100, { upIsGood: true })?.direction).toBe(
      "flat"
    );
  });
});

describe("percentagePointDelta", () => {
  it("reports rate changes in percentage points", () => {
    expect(percentagePointDelta(0.85, 0.8, { upIsGood: true })).toEqual({
      text: "+5.0pp",
      direction: "up",
      positive: true,
    });
    expect(percentagePointDelta(0.8, 0.85, { upIsGood: true })?.positive).toBe(
      false
    );
  });
});

describe("withMovingAverage", () => {
  it("adds a trailing average once the window is full", () => {
    const data = [1, 2, 3, 4].map((traces, i) => ({ date: `d${i}`, traces }));
    const out = withMovingAverage(data, "traces", 3);
    expect(out[0].tracesMa).toBeNull();
    expect(out[1].tracesMa).toBeNull();
    expect(out[2].tracesMa).toBeCloseTo(2); // (1+2+3)/3
    expect(out[3].tracesMa).toBeCloseTo(3); // (2+3+4)/3
  });
});
