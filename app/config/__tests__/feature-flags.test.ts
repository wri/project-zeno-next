import { describe, expect, it } from "vitest";
import { NET_FLUX_FEATURE_FLAG } from "@/app/constants/datasets";
import {
  EXPERIMENTAL_PROFILE,
  LGMS_PROFILE,
  canUseFeatureFlags,
  chatFeatureFlag,
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

  it("returns a public profile for every user type", () => {
    expect(effectiveAgentProfile(LGMS_PROFILE, "regular")).toBe(LGMS_PROFILE);
    expect(effectiveAgentProfile(LGMS_PROFILE, "pro")).toBe(LGMS_PROFILE);
    expect(effectiveAgentProfile(LGMS_PROFILE, null)).toBe(LGMS_PROFILE);
    expect(effectiveAgentProfile(LGMS_PROFILE, "admin")).toBe(LGMS_PROFILE);
  });
});

describe("chatFeatureFlag", () => {
  const noFlags = new Set<string>();
  const netFlux = new Set([NET_FLUX_FEATURE_FLAG]);

  it("sends the experimental profile to privileged users by default", () => {
    expect(chatFeatureFlag(null, "admin", noFlags)).toBe(EXPERIMENTAL_PROFILE);
    expect(chatFeatureFlag(null, "admin", netFlux)).toBe(EXPERIMENTAL_PROFILE);
  });

  it("sends the lgms profile to other users when net-flux is on", () => {
    expect(chatFeatureFlag(null, "regular", netFlux)).toBe(LGMS_PROFILE);
    expect(chatFeatureFlag(null, "pro", netFlux)).toBe(LGMS_PROFILE);
  });

  it("sends nothing for other users without net-flux", () => {
    expect(chatFeatureFlag(null, "regular", noFlags)).toBeNull();
    expect(chatFeatureFlag(null, null, new Set(["ifl"]))).toBeNull();
  });

  it("prefers an explicit profile the backend accepts", () => {
    expect(chatFeatureFlag("beta", "admin", noFlags)).toBe("beta");
    expect(chatFeatureFlag(LGMS_PROFILE, "regular", noFlags)).toBe(
      LGMS_PROFILE
    );
  });

  it("ignores an explicit admin-only profile for other users", () => {
    expect(
      chatFeatureFlag(EXPERIMENTAL_PROFILE, "regular", noFlags)
    ).toBeNull();
    expect(chatFeatureFlag(EXPERIMENTAL_PROFILE, "regular", netFlux)).toBe(
      LGMS_PROFILE
    );
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
