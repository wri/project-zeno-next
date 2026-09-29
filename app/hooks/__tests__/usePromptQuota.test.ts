import { describe, expect, it } from "vitest";

import { shouldShowPromptMeter } from "../usePromptQuota";

describe("shouldShowPromptMeter", () => {
  it("stays hidden below 75% of the daily quota", () => {
    expect(shouldShowPromptMeter(0, 100)).toBe(false);
    expect(shouldShowPromptMeter(74, 100)).toBe(false);
  });

  it("shows from exactly 75% of the daily quota", () => {
    expect(shouldShowPromptMeter(75, 100)).toBe(true);
    expect(shouldShowPromptMeter(15, 20)).toBe(true);
  });

  it("keeps showing at and past 100%", () => {
    expect(shouldShowPromptMeter(100, 100)).toBe(true);
    expect(shouldShowPromptMeter(21, 20)).toBe(true);
  });

  it("never shows for a missing or effectively unlimited quota", () => {
    expect(shouldShowPromptMeter(0, 0)).toBe(false);
    expect(shouldShowPromptMeter(9000, 9999)).toBe(false);
  });
});
