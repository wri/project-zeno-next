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
      checklistDone: ["alerts", "compare"] as const,
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
        tourVersion: FIRST_RUN_TOUR_VERSION,
        tourOutcome: "completed",
        checklistDone: ["alerts", "teleport", "alerts", 7, "own-area"],
        checklistDismissed: true,
      }),
    });
    expect(readProgress(storage)).toEqual({
      tourOutcome: "completed",
      checklistDone: ["alerts", "own-area"],
      checklistDismissed: true,
    });
  });

  it("drops the ticks of the old walkthroughs, which the user didn't do", () => {
    const storage = memoryStorage({
      [ONBOARDING_STORAGE_KEY]: JSON.stringify({
        schemaVersion: PROGRESS_SCHEMA_VERSION,
        tourVersion: 1,
        tourOutcome: "completed",
        checklistDone: [
          "ask",
          "data",
          "area",
          "insight",
          "imagery",
          "dashboard",
        ],
        checklistDismissed: true,
      }),
    });
    expect(readProgress(storage)).toEqual({
      // Version 1's outcome: the new tour shows once more.
      tourOutcome: null,
      checklistDone: [],
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
    const storage = memoryStorage({
      [ONBOARDING_STORAGE_KEY]: JSON.stringify({
        tourOutcome: "skipped",
        checklistDone: ["satellite-imagery"],
        checklistDismissed: false,
      }),
    });
    // Older than the current tour, so its outcome no longer counts.
    expect(readProgress(storage)).toEqual({
      tourOutcome: null,
      checklistDone: ["satellite-imagery"],
      checklistDismissed: false,
    });
  });

  it("forgets the outcome of an older first-run tour, keeping the checklist", () => {
    const storage = memoryStorage({
      [ONBOARDING_STORAGE_KEY]: JSON.stringify({
        schemaVersion: PROGRESS_SCHEMA_VERSION,
        tourVersion: FIRST_RUN_TOUR_VERSION - 1,
        tourOutcome: "completed",
        checklistDone: ["compare"],
        checklistDismissed: false,
      }),
    });
    expect(readProgress(storage)).toEqual({
      tourOutcome: null,
      checklistDone: ["compare"],
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
