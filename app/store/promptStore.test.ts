import { describe, it, expect, vi, beforeEach } from "vitest";
import { usePromptStore } from "./promptStore";
import defaultPromptsData from "@/public/welcome-prompts.json";

/* ---------- helpers ---------- */

/** Reset the Zustand store to its initial state between tests. */
function resetStore() {
  usePromptStore.setState({
    prompts: defaultPromptsData.prompts,
    isLoading: false,
    loadedLanguage: "en",
  });
}

/** Stub global.fetch to return a given JSON body (or reject). */
function mockFetch(body: unknown, ok = true) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    json: async () => body,
  } as Response);
}

/* ---------- tests ---------- */

beforeEach(() => {
  resetStore();
  vi.restoreAllMocks();
});

describe("promptStore – validation (fixes #2 & #3)", () => {
  it("loads valid prompts for a non-default locale", async () => {
    const prompts = ["Montre les changements", "Analyse les tendances"];
    mockFetch({ prompts });

    await usePromptStore.getState().loadPromptsForLanguage("fr");

    const state = usePromptStore.getState();
    expect(state.prompts).toEqual(prompts);
    expect(state.loadedLanguage).toBe("fr");
    expect(state.isLoading).toBe(false);
  });

  it("falls back to English when prompts array is empty", async () => {
    mockFetch({ prompts: [] });

    await usePromptStore.getState().loadPromptsForLanguage("fr");

    const state = usePromptStore.getState();
    expect(state.prompts).toEqual(defaultPromptsData.prompts);
    expect(state.loadedLanguage).toBe("en");
  });

  it("falls back to English when prompts key is missing", async () => {
    mockFetch({ something: "else" });

    await usePromptStore.getState().loadPromptsForLanguage("fr");

    expect(usePromptStore.getState().loadedLanguage).toBe("en");
  });

  it("filters out non-string elements and keeps valid ones", async () => {
    mockFetch({ prompts: ["valid prompt", null, 42, "", "  ", "also valid"] });

    await usePromptStore.getState().loadPromptsForLanguage("es");

    const state = usePromptStore.getState();
    expect(state.prompts).toEqual(["valid prompt", "also valid"]);
    expect(state.loadedLanguage).toBe("es");
  });

  it("falls back to English when all elements are invalid", async () => {
    mockFetch({ prompts: [null, 42, "", "   ", { text: "nope" }] });

    await usePromptStore.getState().loadPromptsForLanguage("es");

    const state = usePromptStore.getState();
    expect(state.prompts).toEqual(defaultPromptsData.prompts);
    expect(state.loadedLanguage).toBe("en");
  });

  it("falls back to English on network error", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Network error"));

    await usePromptStore.getState().loadPromptsForLanguage("pt");

    expect(usePromptStore.getState().loadedLanguage).toBe("en");
  });

  it("falls back to English on non-ok HTTP response", async () => {
    mockFetch({}, false);

    await usePromptStore.getState().loadPromptsForLanguage("id");

    expect(usePromptStore.getState().loadedLanguage).toBe("en");
  });

  it("short-circuits when language is already loaded", async () => {
    const spy = mockFetch({ prompts: ["test"] });

    // Load French
    await usePromptStore.getState().loadPromptsForLanguage("fr");
    expect(spy).toHaveBeenCalledTimes(1);

    // Call again for French — should not fetch
    await usePromptStore.getState().loadPromptsForLanguage("fr");
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("returns English synchronously without fetching", async () => {
    const spy = mockFetch({ prompts: ["test"] });

    // First load French so loadedLanguage !== "en"
    await usePromptStore.getState().loadPromptsForLanguage("fr");
    expect(spy).toHaveBeenCalledTimes(1);

    // Now switch back to English — no fetch
    await usePromptStore.getState().loadPromptsForLanguage("en");
    expect(spy).toHaveBeenCalledTimes(1);
    expect(usePromptStore.getState().prompts).toEqual(defaultPromptsData.prompts);
    expect(usePromptStore.getState().loadedLanguage).toBe("en");
  });
});
