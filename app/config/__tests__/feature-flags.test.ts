import { describe, expect, it } from "vitest";
import {
  EXPERIMENTAL_PROFILE,
  canUseFeatureFlags,
  effectiveAgentProfile,
  isExperimentalProfileEnabled,
} from "../feature-flags";

describe("canUseFeatureFlags", () => {
  it("allows admin, superuser and machine", () => {
    expect(canUseFeatureFlags("admin")).toBe(true);
    expect(canUseFeatureFlags("superuser")).toBe(true);
    expect(canUseFeatureFlags("machine")).toBe(true);
  });

  it("rejects regular, pro and null (backend would 403)", () => {
    expect(canUseFeatureFlags("regular")).toBe(false);
    expect(canUseFeatureFlags("pro")).toBe(false);
    expect(canUseFeatureFlags(null)).toBe(false);
  });
});

describe("effectiveAgentProfile", () => {
  it("returns the profile for privileged user types", () => {
    expect(effectiveAgentProfile("experimental", "admin")).toBe("experimental");
    expect(effectiveAgentProfile("experimental", "machine")).toBe(
      "experimental"
    );
  });

  it("returns null for non-privileged users, so ff is never sent", () => {
    expect(effectiveAgentProfile("experimental", "regular")).toBeNull();
    expect(effectiveAgentProfile("experimental", "pro")).toBeNull();
    expect(effectiveAgentProfile("experimental", null)).toBeNull();
  });

  it("returns null when no profile is selected", () => {
    expect(effectiveAgentProfile(null, "admin")).toBeNull();
    expect(effectiveAgentProfile("", "admin")).toBeNull();
  });

  it("passes through non-experimental profiles for privileged users", () => {
    expect(effectiveAgentProfile("beta", "admin")).toBe("beta");
  });
});

describe("isExperimentalProfileEnabled", () => {
  it("is true only for the experimental profile on a privileged user", () => {
    expect(isExperimentalProfileEnabled(EXPERIMENTAL_PROFILE, "admin")).toBe(
      true
    );
  });

  it("is false for a non-privileged user even with the profile set", () => {
    expect(isExperimentalProfileEnabled("experimental", "regular")).toBe(false);
  });

  it("is false for other or missing profiles", () => {
    expect(isExperimentalProfileEnabled("beta", "admin")).toBe(false);
    expect(isExperimentalProfileEnabled(null, "admin")).toBe(false);
  });
});
