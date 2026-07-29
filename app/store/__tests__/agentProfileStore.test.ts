import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import useAgentProfileStore from "../agentProfileStore";

const STORAGE_KEY = "agent_profile";

let _storage: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => _storage[key] ?? null,
  setItem: (key: string, value: string) => {
    _storage[key] = value;
  },
  removeItem: (key: string) => {
    delete _storage[key];
  },
};

// The store reads window.location.search and window.localStorage; stub both.
function setUrl(search: string) {
  vi.stubGlobal("window", {
    location: { search },
    localStorage: localStorageMock,
  });
}

describe("agentProfileStore", () => {
  beforeEach(() => {
    _storage = {};
    useAgentProfileStore.setState({ agentProfile: null });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("activates the profile from the URL param and persists it", () => {
    setUrl("?agent_profile=experimental");
    useAgentProfileStore.getState().initFromUrl();
    expect(useAgentProfileStore.getState().agentProfile).toBe("experimental");
    expect(_storage[STORAGE_KEY]).toBe("experimental");
  });

  it("keeps the persisted value when the param is absent", () => {
    _storage[STORAGE_KEY] = "experimental";
    useAgentProfileStore.setState({ agentProfile: "experimental" });
    setUrl(""); // no param present
    useAgentProfileStore.getState().initFromUrl();
    expect(useAgentProfileStore.getState().agentProfile).toBe("experimental");
  });

  it("clears the profile (and storage) on a reset value", () => {
    _storage[STORAGE_KEY] = "experimental";
    useAgentProfileStore.setState({ agentProfile: "experimental" });
    setUrl("?agent_profile=default");
    useAgentProfileStore.getState().initFromUrl();
    expect(useAgentProfileStore.getState().agentProfile).toBeNull();
    expect(_storage[STORAGE_KEY]).toBeUndefined();
  });

  it("trims whitespace around the param value", () => {
    setUrl("?agent_profile=%20experimental%20");
    useAgentProfileStore.getState().initFromUrl();
    expect(useAgentProfileStore.getState().agentProfile).toBe("experimental");
  });

  it("setAgentProfile(null) removes the persisted value", () => {
    _storage[STORAGE_KEY] = "experimental";
    setUrl("?agent_profile=experimental");
    useAgentProfileStore.getState().setAgentProfile(null);
    expect(useAgentProfileStore.getState().agentProfile).toBeNull();
    expect(_storage[STORAGE_KEY]).toBeUndefined();
  });
});
