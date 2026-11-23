import { describe, expect, it } from "vitest";
import { LOCALES } from "@/src/shared/lib/i18n";
import { SAMPLE_PROMPTS } from "../sample-prompts";

describe("SAMPLE_PROMPTS", () => {
  // SamplePrompts picks by index, so every locale must line up with English.
  it.each(LOCALES)("has one %s prompt per English prompt", (locale) => {
    expect(SAMPLE_PROMPTS[locale]).toHaveLength(SAMPLE_PROMPTS.en.length);
  });

  it.each(LOCALES)("has no empty or duplicate %s prompts", (locale) => {
    const prompts = SAMPLE_PROMPTS[locale];
    expect(prompts.every((p) => p.trim() !== "")).toBe(true);
    expect(new Set(prompts).size).toBe(prompts.length);
  });
});
