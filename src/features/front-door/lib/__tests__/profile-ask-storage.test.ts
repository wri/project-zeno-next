import { describe, expect, it } from "vitest";

import { EMPTY_PROFILE_ASK_RECORD } from "../../model/profile-ask";
import {
  loadProfileAskRecord,
  saveProfileAskRecord,
  type ProfileAskStorages,
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

function storages(): ProfileAskStorages & {
  local: MemoryStorage;
  session: MemoryStorage;
} {
  return { local: new MemoryStorage(), session: new MemoryStorage() };
}

const RECORD = {
  dismissals: 2,
  lifetimeAnswers: 7,
  askedThisSession: true,
  sessionAnswers: 3,
};

describe("profile ask storage", () => {
  it("round-trips a record", () => {
    const s = storages();
    saveProfileAskRecord(s, "u-1", RECORD);
    expect(loadProfileAskRecord(s, "u-1")).toEqual(RECORD);
  });

  it("returns the empty record for someone never asked", () => {
    expect(loadProfileAskRecord(storages(), "u-1")).toEqual(
      EMPTY_PROFILE_ASK_RECORD
    );
  });

  it("keeps lifetime counts in local storage and session state in session storage", () => {
    const s = storages();
    saveProfileAskRecord(s, "u-1", RECORD);
    expect(JSON.parse(s.local.getItem("gnw_profile_ask_v1:u-1")!)).toEqual({
      dismissals: 2,
      lifetimeAnswers: 7,
    });
    expect(
      JSON.parse(s.session.getItem("gnw_profile_ask_session_v1:u-1")!)
    ).toEqual({ askedThisSession: true, sessionAnswers: 3 });
  });

  it("starts a new session with the lifetime counts carried over", () => {
    const s = storages();
    saveProfileAskRecord(s, "u-1", RECORD);
    s.session.clear();
    expect(loadProfileAskRecord(s, "u-1")).toEqual({
      dismissals: 2,
      lifetimeAnswers: 7,
      askedThisSession: false,
      sessionAnswers: 0,
    });
  });

  it("keeps each person's record separate", () => {
    const s = storages();
    saveProfileAskRecord(s, "u-1", RECORD);
    expect(loadProfileAskRecord(s, "u-2")).toEqual(EMPTY_PROFILE_ASK_RECORD);
  });

  it("falls back to defaults for corrupt or unexpected values", () => {
    const s = storages();
    s.local.setItem("gnw_profile_ask_v1:u-1", "{not json");
    s.session.setItem(
      "gnw_profile_ask_session_v1:u-1",
      JSON.stringify({ askedThisSession: "yes", sessionAnswers: -2 })
    );
    expect(loadProfileAskRecord(s, "u-1")).toEqual(EMPTY_PROFILE_ASK_RECORD);

    s.local.setItem(
      "gnw_profile_ask_v1:u-1",
      JSON.stringify({ dismissals: 1.5, lifetimeAnswers: "3" })
    );
    expect(loadProfileAskRecord(s, "u-1")).toEqual(EMPTY_PROFILE_ASK_RECORD);

    s.local.setItem("gnw_profile_ask_v1:u-1", JSON.stringify([1, 2]));
    expect(loadProfileAskRecord(s, "u-1")).toEqual(EMPTY_PROFILE_ASK_RECORD);
  });

  it("never throws when storage is blocked or full", () => {
    const blocked = {
      local: new BlockedStorage(),
      session: new BlockedStorage(),
    };
    expect(() => saveProfileAskRecord(blocked, "u-1", RECORD)).not.toThrow();
    expect(loadProfileAskRecord(blocked, "u-1")).toEqual(
      EMPTY_PROFILE_ASK_RECORD
    );
  });

  it("works without storage at all", () => {
    const none = { local: null, session: null };
    expect(() => saveProfileAskRecord(none, "u-1", RECORD)).not.toThrow();
    expect(loadProfileAskRecord(none, "u-1")).toEqual(EMPTY_PROFILE_ASK_RECORD);
  });
});
