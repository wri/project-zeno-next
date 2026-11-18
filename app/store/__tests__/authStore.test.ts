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

  it("takes termsAccepted from the server", () => {
    useAuthStore
      .getState()
      .setAuthStatus({ ...BASE, hasProfile: false, termsAccepted: true });
    expect(useAuthStore.getState().termsAccepted).toBe(true);
    expect(useAuthStore.getState().hasProfile).toBe(false);
  });

  it("defaults to not accepted when the server doesn't say", () => {
    useAuthStore.getState().setAuthStatus({ ...BASE, hasProfile: true });
    expect(useAuthStore.getState().termsAccepted).toBe(false);
  });

  it("keeps the name from /api/auth/me", () => {
    useAuthStore
      .getState()
      .setAuthStatus({ ...BASE, hasProfile: false, name: "Maria Silva" });
    expect(useAuthStore.getState().userName).toBe("Maria Silva");
  });

  it("clearAuth resets the new fields", () => {
    useAuthStore.getState().setAuthStatus({
      ...BASE,
      hasProfile: true,
      name: "Maria Silva",
      termsAccepted: true,
    });
    useAuthStore.getState().clearAuth();
    const state = useAuthStore.getState();
    expect(state.userName).toBeNull();
    expect(state.termsAccepted).toBe(false);
    expect(state.hasProfile).toBe(false);
  });
});
