import { describe, expect, it } from "vitest";
import {
  DIVERGING_QUALITY,
  divergingQuality,
  SEQUENTIAL_AMBER,
  sequentialAmber,
  SEQUENTIAL_BLUE,
  sequentialBlue,
} from "../palette";

function rgb(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
}

describe("sequential ramps", () => {
  it("hit their endpoints and clamp outside [0, 1]", () => {
    expect(sequentialBlue(0)).toBe(rgb(SEQUENTIAL_BLUE.from));
    expect(sequentialBlue(1)).toBe(rgb(SEQUENTIAL_BLUE.to));
    expect(sequentialBlue(-2)).toBe(sequentialBlue(0));
    expect(sequentialAmber(0)).toBe(rgb(SEQUENTIAL_AMBER.from));
    expect(sequentialAmber(1)).toBe(rgb(SEQUENTIAL_AMBER.to));
    expect(sequentialAmber(5)).toBe(sequentialAmber(1));
  });
});

describe("divergingQuality", () => {
  it("maps -1 / 0 / +1 to the below / mid / above poles", () => {
    expect(divergingQuality(-1)).toBe(rgb(DIVERGING_QUALITY.below));
    expect(divergingQuality(0)).toBe(rgb(DIVERGING_QUALITY.mid));
    expect(divergingQuality(1)).toBe(rgb(DIVERGING_QUALITY.above));
  });

  it("clamps beyond the poles and keeps each arm on its own hue", () => {
    expect(divergingQuality(-3)).toBe(divergingQuality(-1));
    expect(divergingQuality(3)).toBe(divergingQuality(1));
    expect(divergingQuality(-0.5)).not.toBe(divergingQuality(0.5));
  });
});
