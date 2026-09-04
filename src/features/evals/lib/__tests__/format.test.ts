import { describe, expect, it } from "vitest";
import { fmtCI, fmtLatency, fmtPct, fmtRunDate } from "../format";

describe("format", () => {
  it("formats rates and placeholders", () => {
    expect(fmtPct(0.82638, 1)).toBe("82.6%");
    expect(fmtPct(1)).toBe("100.0%");
    expect(fmtPct(null)).toBe("–");
  });

  it("formats Wilson intervals", () => {
    expect(fmtCI(0.756264, 0.879551)).toBe("75.6–88.0%");
  });

  it("formats run dates from ISO timestamps", () => {
    expect(fmtRunDate("2026-08-31T16:33:47Z")).toBe("2026-08-31");
  });

  it("formats latency", () => {
    expect(fmtLatency(36.3)).toBe("36s");
    expect(fmtLatency(126.2)).toBe("2m 6s");
    expect(fmtLatency(null)).toBe("–");
  });
});
