import { beforeEach, describe, expect, it } from "vitest";

import useAuthStore from "../authStore";

const BASE = {
  email: "maria@example.org",
  id: "u-1",
  userType: null,
};

describe("authStore terms acceptance", () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
  });

  it("counts a stored acceptance as accepted", () => {
    useAuthStore.getState().setAuthStatus({
      ...BASE,
      hasProfile: false,
      termsAcceptedAt: "2026-09-30T10:00:00Z",
      termsVersion: "2026-09-30",
    });
    const state = useAuthStore.getState();
    expect(state.termsAccepted).toBe(true);
    expect(state.termsVersion).toBe("2026-09-30");
    expect(state.hasProfile).toBe(false);
  });

  it("counts a legacy profile (the old onboarding form had the checkbox) as accepted", () => {
    useAuthStore.getState().setAuthStatus({ ...BASE, hasProfile: true });
    expect(useAuthStore.getState().termsAccepted).toBe(true);
    expect(useAuthStore.getState().termsAcceptedAt).toBeNull();
  });

  it("is not accepted with neither", () => {
    useAuthStore.getState().setAuthStatus({
      ...BASE,
      hasProfile: false,
      termsAcceptedAt: null,
    });
    expect(useAuthStore.getState().termsAccepted).toBe(false);
  });

  it("keeps the name from /api/auth/me", () => {
    useAuthStore
      .getState()
      .setAuthStatus({ ...BASE, hasProfile: false, name: "Maria Silva" });
    expect(useAuthStore.getState().userName).toBe("Maria Silva");
  });

  it("acceptTerms records the version and opens /app without touching the profile", () => {
    useAuthStore.getState().setAuthStatus({ ...BASE, hasProfile: false });
    useAuthStore.getState().acceptTerms("2026-09-30");
    const state = useAuthStore.getState();
    expect(state.termsAccepted).toBe(true);
    expect(state.termsVersion).toBe("2026-09-30");
    expect(state.termsAcceptedAt).not.toBeNull();
    expect(state.hasProfile).toBe(false);
  });

  it("markProfileComplete sets the profile and implies accepted terms", () => {
    useAuthStore.getState().setAuthStatus({ ...BASE, hasProfile: false });
    useAuthStore.getState().markProfileComplete();
    expect(useAuthStore.getState().hasProfile).toBe(true);
    expect(useAuthStore.getState().termsAccepted).toBe(true);
  });

  it("clearAuth resets the new fields", () => {
    useAuthStore.getState().setAuthStatus({
      ...BASE,
      hasProfile: true,
      name: "Maria Silva",
      termsAcceptedAt: "2026-09-30T10:00:00Z",
      termsVersion: "2026-09-30",
    });
    useAuthStore.getState().clearAuth();
    const state = useAuthStore.getState();
    expect(state.userName).toBeNull();
    expect(state.termsAcceptedAt).toBeNull();
    expect(state.termsVersion).toBeNull();
    expect(state.termsAccepted).toBe(false);
    expect(state.hasProfile).toBe(false);
  });
});
