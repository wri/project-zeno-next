import { describe, expect, it } from "vitest";
import {
  binValues,
  finiteNumbers,
  mean,
  median,
  quantile,
} from "../analytics/stats";

describe("quantile", () => {
  it("matches pandas linear interpolation", () => {
    // pandas: Series([1,2,3,4]).quantile(0.95) == 3.85
    expect(quantile([1, 2, 3, 4], 0.95)).toBeCloseTo(3.85, 10);
  });

  it("handles single values and empty input", () => {
    expect(quantile([7], 0.95)).toBe(7);
    expect(quantile([], 0.95)).toBe(0);
  });

  it("is order-independent", () => {
    expect(quantile([4, 1, 3, 2], 0.5)).toBe(2.5);
  });
});

describe("mean / median", () => {
  it("computes mean", () => {
    expect(mean([1, 2, 3])).toBe(2);
    expect(mean([])).toBe(0);
  });

  it("computes median for odd and even counts", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });
});

describe("finiteNumbers", () => {
  it("drops null, undefined and NaN", () => {
    expect(finiteNumbers([1, null, undefined, NaN, 2])).toEqual([1, 2]);
  });
});

describe("binValues", () => {
  it("covers the full range and preserves total count", () => {
    const values = Array.from({ length: 100 }, (_, i) => i / 10);
    const bins = binValues(values, 10);
    expect(bins.reduce((acc, b) => acc + b.count, 0)).toBe(100);
    expect(bins[0].binStart).toBeLessThanOrEqual(0);
    expect(bins[bins.length - 1].binEnd).toBeGreaterThanOrEqual(9.9);
  });

  it("handles constant series with a single bin", () => {
    expect(binValues([5, 5, 5], 30)).toEqual([
      { binStart: 5, binEnd: 5, count: 3 },
    ]);
  });

  it("returns empty for empty input", () => {
    expect(binValues([], 30)).toEqual([]);
  });

  it("integer mode uses whole-number steps and exact unit buckets", () => {
    const values = [1, 1, 2, 3, 10];
    const bins = binValues(values, 30, { integer: true });
    // Small integer range → step 1, one bucket per value, max in its own bin.
    expect(bins[0]).toEqual({ binStart: 1, binEnd: 2, count: 2 });
    expect(bins[bins.length - 1]).toEqual({
      binStart: 10,
      binEnd: 11,
      count: 1,
    });
    expect(bins.every((b) => Number.isInteger(b.binStart))).toBe(true);
    expect(bins.reduce((acc, b) => acc + b.count, 0)).toBe(values.length);
  });

  it("integer mode never produces fractional steps for narrow ranges", () => {
    const bins = binValues([1, 2, 3], 30, { integer: true });
    expect(bins.map((b) => b.binEnd - b.binStart)).toEqual([1, 1, 1]);
  });
});
