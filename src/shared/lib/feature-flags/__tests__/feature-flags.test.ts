import { describe, expect, it } from "vitest";
import { enabledFlags, isFeatureEnabled } from "../feature-flags";

const params = (query: string) => new URLSearchParams(query);

describe("isFeatureEnabled", () => {
  it("is false when no ff param is present", () => {
    expect(isFeatureEnabled(params(""), "analysis")).toBe(false);
  });

  it("is true when the flag is the sole ff value", () => {
    expect(isFeatureEnabled(params("ff=analysis"), "analysis")).toBe(true);
  });

  it("is true when the flag is among comma-separated ff values", () => {
    expect(isFeatureEnabled(params("ff=foo,analysis,bar"), "analysis")).toBe(
      true
    );
  });

  it("ignores surrounding whitespace", () => {
    expect(isFeatureEnabled(params("ff=foo, analysis "), "analysis")).toBe(
      true
    );
  });

  it("is false when the flag is absent from ff", () => {
    expect(isFeatureEnabled(params("ff=foo,bar"), "analysis")).toBe(false);
  });
});

describe("enabledFlags", () => {
  it("is empty when no ff param is present", () => {
    expect(enabledFlags(params(""))).toEqual(new Set());
  });

  it("collects every comma-separated flag, trimmed", () => {
    expect(enabledFlags(params("ff=foo, analysis ,bar"))).toEqual(
      new Set(["foo", "analysis", "bar"])
    );
  });
});
