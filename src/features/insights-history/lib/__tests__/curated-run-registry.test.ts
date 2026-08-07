import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  forgetCuratedRun,
  getCuratedRun,
  rememberCuratedRun,
} from "../curated-run-registry";

const STORAGE_KEY = "curated-analysis-insights";

/** Minimal in-memory localStorage double for the node test environment. */
function fakeStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => [...store.keys()][index] ?? null,
    get length() {
      return store.size;
    },
  };
}

describe("curated run registry", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      value: fakeStorage(),
      configurable: true,
    });
  });

  afterEach(() => {
    delete (globalThis as { localStorage?: Storage }).localStorage;
  });

  it("round-trips a remembered run per (dashboard, dataset) pair", () => {
    rememberCuratedRun("dash-1", 4, {
      insightId: "insight-a",
      config: { titles: { c1: "Tree cover loss in Pará" } },
    });
    rememberCuratedRun("dash-1", 11, { insightId: "insight-b" });
    rememberCuratedRun("dash-2", 4, { insightId: "insight-c" });

    expect(getCuratedRun("dash-1", 4)).toEqual({
      insightId: "insight-a",
      config: { titles: { c1: "Tree cover loss in Pará" } },
    });
    expect(getCuratedRun("dash-1", 11)).toEqual({ insightId: "insight-b" });
    expect(getCuratedRun("dash-2", 4)).toEqual({ insightId: "insight-c" });
    expect(getCuratedRun("dash-3", 4)).toBeUndefined();
  });

  it("forgets a single entry without touching the others", () => {
    rememberCuratedRun("dash-1", 4, { insightId: "insight-a" });
    rememberCuratedRun("dash-1", 11, { insightId: "insight-b" });

    forgetCuratedRun("dash-1", 4);

    expect(getCuratedRun("dash-1", 4)).toBeUndefined();
    expect(getCuratedRun("dash-1", 11)).toEqual({ insightId: "insight-b" });
  });

  it("tolerates corrupt stored JSON", () => {
    globalThis.localStorage.setItem(STORAGE_KEY, "{not json");
    expect(getCuratedRun("dash-1", 4)).toBeUndefined();
    // A write after corruption starts a fresh registry rather than throwing.
    rememberCuratedRun("dash-1", 4, { insightId: "insight-a" });
    expect(getCuratedRun("dash-1", 4)).toEqual({ insightId: "insight-a" });
  });

  it("drops malformed entries but keeps valid ones", () => {
    globalThis.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        "dash-1:4": { insightId: "insight-a" },
        "dash-1:11": "just-a-string",
        "dash-2:4": 42,
      })
    );
    expect(getCuratedRun("dash-1", 4)).toEqual({ insightId: "insight-a" });
    expect(getCuratedRun("dash-1", 11)).toBeUndefined();
    expect(getCuratedRun("dash-2", 4)).toBeUndefined();
  });

  it("degrades to no-ops when localStorage is unavailable", () => {
    delete (globalThis as { localStorage?: Storage }).localStorage;
    expect(() =>
      rememberCuratedRun("dash-1", 4, { insightId: "insight-a" })
    ).not.toThrow();
    expect(getCuratedRun("dash-1", 4)).toBeUndefined();
    expect(() => forgetCuratedRun("dash-1", 4)).not.toThrow();
  });
});
