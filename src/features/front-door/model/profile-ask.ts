/**
 * When to ask a signed-in person for their profile.
 *
 * The profile moves out of the way in: people reach their first answer first,
 * and GNW asks for details at a few natural moments afterwards. The rules live
 * here, framework-free, so they can be unit-tested and so every surface that
 * asks (in-chat card, banner, save dialog) obeys the same limits.
 */

/** Moments at which GNW may ask. `entry` exists so callers can't forget the rule. */
export type ProfileAskMoment =
  | "entry"
  | "first_answer"
  | "nth_question"
  | "saved_item"
  | "quota_low";

export interface ProfileAskState {
  profileComplete: boolean;
  /** Lifetime count of "Not now" clicks. */
  dismissals: number;
  /** Whether any surface has already asked in this browser session. */
  askedThisSession: boolean;
}

/** After this many "Not now"s, only the account-menu reminder remains. */
export const MAX_PROFILE_DISMISSALS = 3;

/** The answer in a session that earns a later, lighter ask (banner). */
export const NTH_QUESTION_ASK = 5;

export const INITIAL_PROFILE_ASK_STATE: ProfileAskState = {
  profileComplete: false,
  dismissals: 0,
  askedThisSession: false,
};

export function shouldAskForProfile(
  state: ProfileAskState,
  moment: ProfileAskMoment
): boolean {
  if (state.profileComplete) return false;
  // Never on the way in: the whole point is to answer the question first.
  if (moment === "entry") return false;
  if (state.askedThisSession) return false;
  return state.dismissals < MAX_PROFILE_DISMISSALS;
}

export interface AnswerCounts {
  /** Answers the person has ever received, including this one. */
  lifetime: number;
  /** Answers in the current browser session, including this one. */
  session: number;
}

/**
 * The moment reached after an answer, or null when it isn't one we ask after.
 * "First answer" means the person's first ever, not the first of each session:
 * otherwise it would use up every session's single ask and the later, lighter
 * asks would never be reached.
 */
export function askMomentAfterAnswer(
  counts: AnswerCounts
): ProfileAskMoment | null {
  if (counts.lifetime === 1) return "first_answer";
  if (counts.session === NTH_QUESTION_ASK) return "nth_question";
  return null;
}

/** The account-menu reminder stays until the profile is complete. */
export function showProfileMenuReminder(state: ProfileAskState): boolean {
  return !state.profileComplete;
}

export function recordProfileAsked(state: ProfileAskState): ProfileAskState {
  return { ...state, askedThisSession: true };
}

export function recordProfileDismissed(
  state: ProfileAskState
): ProfileAskState {
  return { ...state, dismissals: state.dismissals + 1 };
}

export function recordProfileCompleted(
  state: ProfileAskState
): ProfileAskState {
  return { ...state, profileComplete: true };
}

/** A new browser session: lifetime counts carry over, the session flag resets. */
export function startNewSession(state: ProfileAskState): ProfileAskState {
  return { ...state, askedThisSession: false };
}
