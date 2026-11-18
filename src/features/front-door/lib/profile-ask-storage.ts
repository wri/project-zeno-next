import type { ProfileAskRecord } from "../model/profile-ask";

/**
 * Where the ask record lives (localStorage in the browser), injected so this
 * module stays free of browser globals (and testable in node). Null when the
 * browser doesn't offer it (private windows, blocked site data, SSR).
 */
export type ProfileAskStorage = Storage | null;

// v2: the record moved from per-session asks to per-conversation banners.
const KEY = "gnw_profile_ask_v2";

function keyFor(userKey: string): string {
  return `${KEY}:${userKey}`;
}

function readObject(
  storage: ProfileAskStorage,
  key: string
): Record<string, unknown> {
  try {
    const raw = storage?.getItem(key);
    if (!raw) return {};
    const value: unknown = JSON.parse(raw);
    return typeof value === "object" && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function count(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : 0;
}

/**
 * The stored record for one person, with defaults for anything missing,
 * unreadable or corrupt. Never throws.
 */
export function loadProfileAskRecord(
  storage: ProfileAskStorage,
  userKey: string
): ProfileAskRecord {
  const stored = readObject(storage, keyFor(userKey));
  return {
    lifetimeAnswers: count(stored.lifetimeAnswers),
    cardShown: stored.cardShown === true,
    bannersShown: count(stored.bannersShown),
  };
}

/** Stores the record for one person. Never throws. */
export function saveProfileAskRecord(
  storage: ProfileAskStorage,
  userKey: string,
  record: ProfileAskRecord
): void {
  try {
    storage?.setItem(keyFor(userKey), JSON.stringify(record));
  } catch {
    // Full or blocked storage: the ask state is a convenience, not a record.
  }
}
