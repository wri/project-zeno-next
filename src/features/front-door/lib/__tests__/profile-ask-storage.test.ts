import { describe, expect, it } from "vitest";

import { EMPTY_PROFILE_ASK_RECORD } from "../../model/profile-ask";
import {
  loadProfileAskRecord,
  saveProfileAskRecord,
} from "../profile-ask-storage";
import { MemoryStorage } from "./memory-storage";

/** Storage that throws on every access (e.g. blocked site data). */
class BlockedStorage extends MemoryStorage {
  getItem(): string | null {
    throw new DOMException("blocked", "SecurityError");
  }
  setItem(): void {
    throw new DOMException("full", "QuotaExceededError");
  }
}

const KEY = "gnw_profile_ask_v2:u-1";

const RECORD = { lifetimeAnswers: 7, cardShown: true, bannersShown: 1 };

describe("profile ask storage", () => {
  it("round-trips a record", () => {
    const s = new MemoryStorage();
    saveProfileAskRecord(s, "u-1", RECORD);
    expect(loadProfileAskRecord(s, "u-1")).toEqual(RECORD);
    expect(JSON.parse(s.getItem(KEY)!)).toEqual(RECORD);
  });

  it("returns the empty record for someone never asked", () => {
    expect(loadProfileAskRecord(new MemoryStorage(), "u-1")).toEqual(
      EMPTY_PROFILE_ASK_RECORD
    );
  });

  it("keeps each person's record separate", () => {
    const s = new MemoryStorage();
    saveProfileAskRecord(s, "u-1", RECORD);
    expect(loadProfileAskRecord(s, "u-2")).toEqual(EMPTY_PROFILE_ASK_RECORD);
  });

  it("falls back to defaults for corrupt or unexpected values", () => {
    const s = new MemoryStorage();
    s.setItem(KEY, "{not json");
    expect(loadProfileAskRecord(s, "u-1")).toEqual(EMPTY_PROFILE_ASK_RECORD);

    s.setItem(
      KEY,
      JSON.stringify({
        lifetimeAnswers: 1.5,
        cardShown: "yes",
        bannersShown: -2,
      })
    );
    expect(loadProfileAskRecord(s, "u-1")).toEqual(EMPTY_PROFILE_ASK_RECORD);

    s.setItem(KEY, JSON.stringify([1, 2]));
    expect(loadProfileAskRecord(s, "u-1")).toEqual(EMPTY_PROFILE_ASK_RECORD);
  });

  it("never throws when storage is blocked or full", () => {
    const blocked = new BlockedStorage();
    expect(() => saveProfileAskRecord(blocked, "u-1", RECORD)).not.toThrow();
    expect(loadProfileAskRecord(blocked, "u-1")).toEqual(
      EMPTY_PROFILE_ASK_RECORD
    );
  });

  it("works without storage at all", () => {
    expect(() => saveProfileAskRecord(null, "u-1", RECORD)).not.toThrow();
    expect(loadProfileAskRecord(null, "u-1")).toEqual(EMPTY_PROFILE_ASK_RECORD);
  });
});
