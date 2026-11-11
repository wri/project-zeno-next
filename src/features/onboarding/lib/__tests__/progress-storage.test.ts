import { describe, expect, it } from "vitest";

import {
  EMPTY_PROGRESS,
  FIRST_RUN_TOUR_VERSION,
} from "../../model/onboarding-progress";
import {
  ONBOARDING_STORAGE_KEY,
  PROGRESS_SCHEMA_VERSION,
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

  it("drops unknown checklist items and keeps the rest", () => {
    const storage = memoryStorage({
      [ONBOARDING_STORAGE_KEY]: JSON.stringify({
        tourOutcome: "completed",
        checklistDone: ["ask", "teleport", "ask", 7, "data"],
        checklistDismissed: true,
      }),
    });
    expect(readProgress(storage)).toEqual({
      tourOutcome: "completed",
      checklistDone: ["ask", "data"],
      checklistDismissed: true,
    });
  });

  it("falls back field by field on malformed values", () => {
    const storage = memoryStorage({
      [ONBOARDING_STORAGE_KEY]: JSON.stringify({
        tourOutcome: "abandoned",
        checklistDone: "ask",
        checklistDismissed: "yes",
      }),
    });
    expect(readProgress(storage)).toEqual(EMPTY_PROGRESS);
  });

  it("reads values stored before versions existed as version 1", () => {
    const legacy = {
      tourOutcome: "skipped",
      checklistDone: ["imagery"],
      checklistDismissed: false,
    };
    const storage = memoryStorage({
      [ONBOARDING_STORAGE_KEY]: JSON.stringify(legacy),
    });
    expect(readProgress(storage)).toEqual(legacy);
  });

  it("forgets the outcome of an older first-run tour, keeping the checklist", () => {
    const storage = memoryStorage({
      [ONBOARDING_STORAGE_KEY]: JSON.stringify({
        schemaVersion: PROGRESS_SCHEMA_VERSION,
        tourVersion: FIRST_RUN_TOUR_VERSION - 1,
        tourOutcome: "completed",
        checklistDone: ["ask"],
        checklistDismissed: false,
      }),
    });
    expect(readProgress(storage)).toEqual({
      tourOutcome: null,
      checklistDone: ["ask"],
      checklistDismissed: false,
    });
  });

  it("ignores a stored value that isn't an object", () => {
    const storage = memoryStorage({ [ONBOARDING_STORAGE_KEY]: "42" });
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
  it("records the schema and first-run tour versions with the progress", () => {
    const storage = memoryStorage();
    writeProgress(storage, EMPTY_PROGRESS);
    expect(
      JSON.parse(storage.getItem(ONBOARDING_STORAGE_KEY) ?? "null")
    ).toEqual({
      schemaVersion: PROGRESS_SCHEMA_VERSION,
      tourVersion: FIRST_RUN_TOUR_VERSION,
      ...EMPTY_PROGRESS,
    });
  });

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
