import { describe, expect, it } from "vitest";
import {
  EXPERIMENTAL_PROFILE,
  LGMS_PROFILE,
  canUseFeatureFlags,
  chatFeatureFlag,
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

describe("chatFeatureFlag", () => {
  it("sends privileged users their profile, defaulting to experimental", () => {
    expect(chatFeatureFlag(null, "admin", false)).toBe(EXPERIMENTAL_PROFILE);
    expect(chatFeatureFlag(null, "machine", true)).toBe(EXPERIMENTAL_PROFILE);
    expect(chatFeatureFlag("beta", "superuser", true)).toBe("beta");
  });

  it("sends other users the lgms profile only when net-flux is on", () => {
    expect(chatFeatureFlag(null, "regular", true)).toBe(LGMS_PROFILE);
    expect(chatFeatureFlag(EXPERIMENTAL_PROFILE, "pro", true)).toBe(
      LGMS_PROFILE
    );
    expect(chatFeatureFlag(null, null, true)).toBe(LGMS_PROFILE);
    expect(chatFeatureFlag(EXPERIMENTAL_PROFILE, "regular", false)).toBeNull();
  });
});
