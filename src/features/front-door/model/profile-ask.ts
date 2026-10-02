/**
 * When to ask a signed-in person for their profile.
 *
 * The profile moves out of the way in: people reach their first answer first,
 * and GNW asks for details at a few natural moments afterwards. The rules live
 * here, framework-free, so they can be unit-tested and so every surface that
 * asks (in-chat card, banner) obeys the same limits.
 */

/** The moments GNW asks at: the in-chat card, then the lighter banner. */
export type ProfileAskMoment = "first_answer" | "nth_question";

/** After this many "Not now"s, only the account-menu reminder remains. */
export const MAX_PROFILE_DISMISSALS = 3;

/** The answer in a session that earns a later, lighter ask (banner). */
export const NTH_QUESTION_ASK = 5;

/**
 * What GNW remembers about asking one person. Dismissals and lifetime
 * answers persist across sessions; the session fields reset with the
 * browser session. Whether the profile is complete comes from the account,
 * not from here.
 */
export interface ProfileAskRecord {
  /** Lifetime count of "Not now" clicks. */
  dismissals: number;
  /** Answers the person has ever received. */
  lifetimeAnswers: number;
  /** Whether any surface has already asked in this browser session. */
  askedThisSession: boolean;
  /** Answers in this browser session. */
  sessionAnswers: number;
}

export const EMPTY_PROFILE_ASK_RECORD: ProfileAskRecord = {
  dismissals: 0,
  lifetimeAnswers: 0,
  askedThisSession: false,
  sessionAnswers: 0,
};

/** At most one ask per session, none once complete or dismissed enough. */
function mayAsk(record: ProfileAskRecord, profileComplete: boolean): boolean {
  return (
    !profileComplete &&
    !record.askedThisSession &&
    record.dismissals < MAX_PROFILE_DISMISSALS
  );
}

/**
 * The moment reached by an answer, given the counts including it. "First
 * answer" means the person's first ever, not the first of each session:
 * otherwise it would use up every session's single ask and the later,
 * lighter asks would never be reached.
 */
function momentAt(
  lifetimeAnswers: number,
  sessionAnswers: number
): ProfileAskMoment | null {
  if (lifetimeAnswers === 1) return "first_answer";
  if (sessionAnswers === NTH_QUESTION_ASK) return "nth_question";
  return null;
}

/**
 * An answer just finished: count it, and return the moment to ask at, if
 * the policy allows one now. The ask itself is recorded separately
 * (`recordAskShown`), once something is actually shown.
 */
export function recordAnswer(
  record: ProfileAskRecord,
  profileComplete: boolean
): { record: ProfileAskRecord; ask: ProfileAskMoment | null } {
  const counted: ProfileAskRecord = {
    ...record,
    lifetimeAnswers: record.lifetimeAnswers + 1,
    sessionAnswers: record.sessionAnswers + 1,
  };
  const moment = momentAt(counted.lifetimeAnswers, counted.sessionAnswers);
  return {
    record: counted,
    ask: moment && mayAsk(record, profileComplete) ? moment : null,
  };
}

export function recordAskShown(record: ProfileAskRecord): ProfileAskRecord {
  return { ...record, askedThisSession: true };
}

export function recordAskDismissed(record: ProfileAskRecord): ProfileAskRecord {
  return { ...record, dismissals: record.dismissals + 1 };
}

/** A new browser session: lifetime counts carry over, session state resets. */
export function startNewSession(record: ProfileAskRecord): ProfileAskRecord {
  return { ...record, askedThisSession: false, sessionAnswers: 0 };
}
