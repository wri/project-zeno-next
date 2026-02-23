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
    vi.spyOn(globalThis, "fetch").mockRejectedValue(
      new TypeError("Network error"),
    );

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

  it("switches to English synchronously without fetching", async () => {
    const spy = mockFetch({ prompts: ["test"] });

    // First load French so loadedLanguage !== "en"
    await usePromptStore.getState().loadPromptsForLanguage("fr");
    expect(spy).toHaveBeenCalledTimes(1);

    // Now switch back to English — no fetch
    await usePromptStore.getState().loadPromptsForLanguage("en");
    expect(spy).toHaveBeenCalledTimes(1);
    expect(usePromptStore.getState().prompts).toEqual(
      defaultPromptsData.prompts,
    );
    expect(usePromptStore.getState().loadedLanguage).toBe("en");
  });
});

describe("promptStore – race condition (fix #1)", () => {
  it("last language wins when switching rapidly", async () => {
    const esPrompts = ["Prompt español"];

    // Control resolution order: fr resolves AFTER es
    let resolveEs!: (v: Response) => void;

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input, init) => {
        const url = typeof input === "string" ? input : (input as Request).url;
        return new Promise<Response>((resolve, reject) => {
          // Wire up abort handling
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
          // fr resolve captured but unused — abort fires first
          if (url.includes("-es")) resolveEs = resolve;
        });
      });

    // Fire both requests without awaiting
    const frPromise = usePromptStore.getState().loadPromptsForLanguage("fr");
    const esPromise = usePromptStore.getState().loadPromptsForLanguage("es");

    // Resolve es first (the newer request)
    resolveEs({
      ok: true,
      status: 200,
      json: async () => ({ prompts: esPrompts }),
    } as Response);
    await esPromise;

    // Now fr resolves late — it was aborted so its promise should also settle
    // The abort already fired, so resolveFr may not have been assigned if the
    // abort rejected first. Either way, await the promise to let it settle.
    await frPromise;

    const state = usePromptStore.getState();
    expect(state.prompts).toEqual(esPrompts);
    expect(state.loadedLanguage).toBe("es");
    expect(state.isLoading).toBe(false);

    fetchSpy.mockRestore();
  });

  it("aborted fetch does not fall back to English", async () => {
    // First, get to a non-English loaded state so switching to English
    // won't short-circuit on the "already loaded" check.
    const frPrompts = ["Prompt français"];
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ prompts: frPrompts }),
    } as Response);
    await usePromptStore.getState().loadPromptsForLanguage("fr");
    expect(usePromptStore.getState().loadedLanguage).toBe("fr");

    // Now mock a slow Spanish fetch that will be aborted
    vi.restoreAllMocks();
    vi.spyOn(globalThis, "fetch").mockImplementation((_input, init) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(new DOMException("Aborted", "AbortError")),
        );
      });
    });

    // Start loading Spanish (loadedLanguage is "fr", so no short-circuit)
    const esPromise = usePromptStore.getState().loadPromptsForLanguage("es");

    // Switch to English — aborts the Spanish fetch
    await usePromptStore.getState().loadPromptsForLanguage("en");

    // Let the aborted es promise settle
    await esPromise;

    // The abort should have been silently ignored — no fallback-to-English
    // from the catch block. State should be English from the explicit switch.
    const state = usePromptStore.getState();
    expect(state.loadedLanguage).toBe("en");
    expect(state.prompts).toEqual(defaultPromptsData.prompts);
    expect(state.isLoading).toBe(false);
  });

  it("passes AbortSignal to fetch", async () => {
    const fetchSpy = mockFetch({ prompts: ["test"] });

    await usePromptStore.getState().loadPromptsForLanguage("fr");

    const callArgs = fetchSpy.mock.calls[0];
    expect(callArgs[1]).toHaveProperty("signal");
    expect(callArgs[1]!.signal).toBeInstanceOf(AbortSignal);
  });
});

describe("promptStore – SamplePrompts reactivity (fix: language switch)", () => {
  /**
   * Models the SamplePrompts component behaviour:
   * – subscribes to promptStore.prompts
   * – picks 3 random samples when prompts change
   *
   * The bug: the old useEffect guard `samplePrompts.length === 0` prevented
   * re-picking after the initial load, so a language switch was silently
   * ignored by the UI.
   */

  it("subscriber sees new prompts after a language switch", async () => {
    const frPrompts = [
      "Montre les changements",
      "Analyse les tendances",
      "Résume les données",
      "Compare les marchés",
    ];
    mockFetch({ prompts: frPrompts });

    // Simulate initial load — component picks from English defaults
    const initialPrompts = usePromptStore.getState().prompts;
    expect(initialPrompts).toEqual(defaultPromptsData.prompts);

    // Track every prompts update the subscriber receives
    const observed: string[][] = [];
    const unsub = usePromptStore.subscribe((state) => {
      if (state.prompts !== initialPrompts) {
        observed.push(state.prompts);
      }
    });

    // Language switch happens
    await usePromptStore.getState().loadPromptsForLanguage("fr");

    unsub();

    // The store MUST have emitted new (French) prompts
    expect(observed.length).toBeGreaterThanOrEqual(1);
    const finalPrompts = observed[observed.length - 1];
    expect(finalPrompts).toEqual(frPrompts);
    // Prompts should NOT be the English defaults
    expect(finalPrompts).not.toEqual(defaultPromptsData.prompts);
  });

  it("subscriber sees updated prompts when switching back to English", async () => {
    const frPrompts = [
      "Prompt français 1",
      "Prompt français 2",
      "Prompt français 3",
    ];
    mockFetch({ prompts: frPrompts });

    // Switch to French
    await usePromptStore.getState().loadPromptsForLanguage("fr");
    expect(usePromptStore.getState().prompts).toEqual(frPrompts);

    // Now switch back to English
    await usePromptStore.getState().loadPromptsForLanguage("en");

    // Store should have English defaults again
    expect(usePromptStore.getState().prompts).toEqual(
      defaultPromptsData.prompts,
    );
    expect(usePromptStore.getState().loadedLanguage).toBe("en");
  });
});
