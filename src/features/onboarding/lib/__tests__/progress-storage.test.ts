import { describe, expect, it } from "vitest";

import { EMPTY_PROGRESS } from "../../model/onboarding-progress";
import {
  ONBOARDING_STORAGE_KEY,
  readProgress,
  writeProgress,
  type KeyValueStorage,
} from "../progress-storage";

function memoryStorage(initial: Record<string, string> = {}): KeyValueStorage {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
  };
}

describe("readProgress", () => {
  it("returns empty progress when nothing is stored", () => {
    expect(readProgress(memoryStorage())).toEqual(EMPTY_PROGRESS);
  });

  it("round-trips what writeProgress stored", () => {
    const storage = memoryStorage();
    const progress = {
      tourOutcome: "completed" as const,
      checklistDone: ["ask", "data"] as const,
      checklistDismissed: false,
    };
    writeProgress(storage, progress);
    expect(readProgress(storage)).toEqual(progress);
  });

  it("ignores malformed JSON", () => {
    const storage = memoryStorage({ [ONBOARDING_STORAGE_KEY]: "{not json" });
    expect(readProgress(storage)).toEqual(EMPTY_PROGRESS);
  });

  it("ignores values with unknown checklist items", () => {
    const storage = memoryStorage({
      [ONBOARDING_STORAGE_KEY]: JSON.stringify({
        tourOutcome: "completed",
        checklistDone: ["teleport"],
        checklistDismissed: false,
      }),
    });
    expect(readProgress(storage)).toEqual(EMPTY_PROGRESS);
  });

  it("falls back when storage throws", () => {
    const storage: KeyValueStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => undefined,
    };
    expect(readProgress(storage)).toEqual(EMPTY_PROGRESS);
  });
});

describe("writeProgress", () => {
  it("swallows storage errors", () => {
    const storage: KeyValueStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
    };
    expect(() => writeProgress(storage, EMPTY_PROGRESS)).not.toThrow();
  });
});
