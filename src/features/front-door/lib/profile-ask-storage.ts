import {
  EMPTY_PROFILE_ASK_RECORD,
  type ProfileAskRecord,
} from "../model/profile-ask";

/**
 * Where the ask record lives, injected so this module stays free of browser
 * globals (and testable in node). Either may be null when the browser
 * doesn't offer it (private windows, blocked site data, SSR).
 */
export interface ProfileAskStorages {
  /** Lifetime counts: dismissals, answers. */
  local: Storage | null;
  /** This browser session: whether GNW asked, answers so far. */
  session: Storage | null;
}

const LOCAL_KEY = "gnw_profile_ask_v1";
const SESSION_KEY = "gnw_profile_ask_session_v1";

function keyFor(prefix: string, userKey: string): string {
  return `${prefix}:${userKey}`;
}

function readObject(
  storage: Storage | null,
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

function writeObject(
  storage: Storage | null,
  key: string,
  value: Record<string, unknown>
): void {
  try {
    storage?.setItem(key, JSON.stringify(value));
  } catch {
    // Full or blocked storage: the ask state is a convenience, not a record.
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
  storages: ProfileAskStorages,
  userKey: string
): ProfileAskRecord {
  const local = readObject(storages.local, keyFor(LOCAL_KEY, userKey));
  const session = readObject(storages.session, keyFor(SESSION_KEY, userKey));
  return {
    ...EMPTY_PROFILE_ASK_RECORD,
    dismissals: count(local.dismissals),
    lifetimeAnswers: count(local.lifetimeAnswers),
    askedThisSession: session.askedThisSession === true,
    sessionAnswers: count(session.sessionAnswers),
  };
}

/** Stores the record for one person. Never throws. */
export function saveProfileAskRecord(
  storages: ProfileAskStorages,
  userKey: string,
  record: ProfileAskRecord
): void {
  writeObject(storages.local, keyFor(LOCAL_KEY, userKey), {
    dismissals: record.dismissals,
    lifetimeAnswers: record.lifetimeAnswers,
  });
  writeObject(storages.session, keyFor(SESSION_KEY, userKey), {
    askedThisSession: record.askedThisSession,
    sessionAnswers: record.sessionAnswers,
  });
}
