// app/store/__tests__/cookieStore.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import useCookieStore, { COOKIE_CONSENT_KEY } from "../cookieStore";
import type { CookiePreferences } from "../cookieStore";

const STORAGE_KEY = COOKIE_CONSENT_KEY;

const ALL_ON: CookiePreferences = {
  analytics: true,
  targetedAdvertising: true,
  personalization: true,
};
const ALL_OFF: CookiePreferences = {
  analytics: false,
  targetedAdvertising: false,
  personalization: false,
};

let _storage: Record<string, string> = {};
vi.stubGlobal("localStorage", {
  getItem: (key: string) => _storage[key] ?? null,
  setItem: (key: string, value: string) => {
    _storage[key] = value;
  },
});

describe("cookieStore", () => {
  beforeEach(() => {
    _storage = {};
    useCookieStore.setState({
      consentStatus: "pending",
      analytics: false,
      targetedAdvertising: false,
      personalization: false,
      preferencesOpen: false,
    });
  });

  it("has correct initial state", () => {
    const state = useCookieStore.getState();
    expect(state.consentStatus).toBe("pending");
    expect(state.analytics).toBe(false);
    expect(state.targetedAdvertising).toBe(false);
    expect(state.personalization).toBe(false);
    expect(state.preferencesOpen).toBe(false);
  });

  it("acceptAll sets all preferences to true and persists", () => {
    useCookieStore.getState().acceptAll();
    const state = useCookieStore.getState();
    expect(state.consentStatus).toBe("accepted");
    expect(state.analytics).toBe(true);
    expect(state.targetedAdvertising).toBe(true);
    expect(state.personalization).toBe(true);
    const stored = JSON.parse(_storage[STORAGE_KEY]);
    expect(stored).toEqual({ status: "accepted", ...ALL_ON });
  });

  it("rejectNonEssential sets all preferences to false and persists", () => {
    useCookieStore.getState().rejectNonEssential();
    const state = useCookieStore.getState();
    expect(state.consentStatus).toBe("rejected");
    expect(state.analytics).toBe(false);
    expect(state.targetedAdvertising).toBe(false);
    expect(state.personalization).toBe(false);
    const stored = JSON.parse(_storage[STORAGE_KEY]);
    expect(stored).toEqual({ status: "rejected", ...ALL_OFF });
  });

  it("hydrate restores accepted state from localStorage", () => {
    _storage[STORAGE_KEY] = JSON.stringify({ status: "accepted", ...ALL_ON });
    useCookieStore.getState().hydrate();
    const state = useCookieStore.getState();
    expect(state.consentStatus).toBe("accepted");
    expect(state.analytics).toBe(true);
    expect(state.targetedAdvertising).toBe(true);
    expect(state.personalization).toBe(true);
  });

  it("hydrate restores rejected state from localStorage", () => {
    _storage[STORAGE_KEY] = JSON.stringify({ status: "rejected", ...ALL_OFF });
    useCookieStore.getState().hydrate();
    const state = useCookieStore.getState();
    expect(state.consentStatus).toBe("rejected");
    expect(state.analytics).toBe(false);
  });

  it("hydrate with no stored value leaves state as pending", () => {
    useCookieStore.getState().hydrate();
    expect(useCookieStore.getState().consentStatus).toBe("pending");
  });

  it("hydrate falls back to false for missing preference fields", () => {
    _storage[STORAGE_KEY] = JSON.stringify({ status: "accepted" });
    useCookieStore.getState().hydrate();
    const state = useCookieStore.getState();
    expect(state.analytics).toBe(false);
    expect(state.targetedAdvertising).toBe(false);
    expect(state.personalization).toBe(false);
  });

  it("openPreferences sets preferencesOpen to true", () => {
    useCookieStore.getState().openPreferences();
    expect(useCookieStore.getState().preferencesOpen).toBe(true);
  });

  it("closePreferences sets preferencesOpen to false", () => {
    useCookieStore.setState({ preferencesOpen: true });
    useCookieStore.getState().closePreferences();
    expect(useCookieStore.getState().preferencesOpen).toBe(false);
  });

  it("savePreferences(all true) sets accepted, persists, closes drawer", () => {
    useCookieStore.setState({ preferencesOpen: true });
    useCookieStore.getState().savePreferences(ALL_ON);
    const state = useCookieStore.getState();
    expect(state.consentStatus).toBe("accepted");
    expect(state.analytics).toBe(true);
    expect(state.preferencesOpen).toBe(false);
    const stored = JSON.parse(_storage[STORAGE_KEY]);
    expect(stored).toEqual({ status: "accepted", ...ALL_ON });
  });

  it("savePreferences(all false) sets rejected, persists, closes drawer", () => {
    useCookieStore.setState({ preferencesOpen: true });
    useCookieStore.getState().savePreferences(ALL_OFF);
    const state = useCookieStore.getState();
    expect(state.consentStatus).toBe("rejected");
    expect(state.preferencesOpen).toBe(false);
    const stored = JSON.parse(_storage[STORAGE_KEY]);
    expect(stored).toEqual({ status: "rejected", ...ALL_OFF });
  });

  it("savePreferences with only analytics true yields accepted", () => {
    useCookieStore
      .getState()
      .savePreferences({
        analytics: true,
        targetedAdvertising: false,
        personalization: false,
      });
    expect(useCookieStore.getState().consentStatus).toBe("accepted");
  });

  it("hydrate with corrupt JSON leaves state as pending", () => {
    _storage[COOKIE_CONSENT_KEY] = "not-valid-json{{{";
    useCookieStore.getState().hydrate();
    expect(useCookieStore.getState().consentStatus).toBe("pending");
  });

  it("hydrate with unknown status leaves state as pending", () => {
    _storage[COOKIE_CONSENT_KEY] = JSON.stringify({
      status: "unknown-value",
      ...ALL_ON,
    });
    useCookieStore.getState().hydrate();
    expect(useCookieStore.getState().consentStatus).toBe("pending");
  });
});
