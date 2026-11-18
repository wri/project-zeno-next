/**
 * When to ask a signed-in person for their profile.
 *
 * The profile moves out of the way in: people reach their first answer first,
 * and GNW asks for details at a few natural moments afterwards. The rules live
 * here, framework-free, so they can be unit-tested and so every surface that
 * asks (in-chat card, banner) obeys the same limits:
 *
 * 1. The card, after the person's first answer ever.
 * 2. If they don't save it ("Not now", or they just carry on), a soft banner
 *    after the first answer of each of their next NUDGE_CONVERSATIONS new
 *    conversations. "Add details" on the banner opens the card.
 * 3. After that, only the account-menu reminder remains.
 *
 * Saving the profile ends every ask.
 */

/** The moments GNW asks at: the in-chat card, then the lighter banner. */
export type ProfileAskMoment = "card" | "banner";

/** How many new conversations get the banner after the card wasn't saved. */
export const NUDGE_CONVERSATIONS = 2;

/**
 * What GNW remembers about asking one person, across sessions. Whether the
 * profile is complete comes from the account, not from here.
 */
export interface ProfileAskRecord {
  /** Answers the person has ever received. */
  lifetimeAnswers: number;
  /** Whether the card has been shown after an answer. */
  cardShown: boolean;
  /** Conversations the banner has been shown in. */
  bannersShown: number;
}

export const EMPTY_PROFILE_ASK_RECORD: ProfileAskRecord = {
  lifetimeAnswers: 0,
  cardShown: false,
  bannersShown: 0,
};

/**
 * The moment an answer reaches, for someone whose profile is incomplete (the
 * caller's gate: nobody with a profile is asked). `firstInConversation`: the
 * answer is to the first question of its conversation.
 */
export function momentFor(
  record: ProfileAskRecord,
  firstInConversation: boolean
): ProfileAskMoment | null {
  // Until the card has actually been shown (e.g. its options failed to
  // load), the next answer tries again.
  if (!record.cardShown) return "card";
  if (firstInConversation && record.bannersShown < NUDGE_CONVERSATIONS) {
    return "banner";
  }
  return null;
}

/**
 * An answer just finished: count it, and return the moment to ask at, if
 * any. The ask itself is recorded separately (`recordAskShown`), once
 * something is actually shown.
 */
export function recordAnswer(
  record: ProfileAskRecord,
  firstInConversation: boolean
): { record: ProfileAskRecord; ask: ProfileAskMoment | null } {
  return {
    record: { ...record, lifetimeAnswers: record.lifetimeAnswers + 1 },
    ask: momentFor(record, firstInConversation),
  };
}

export function recordAskShown(
  record: ProfileAskRecord,
  moment: ProfileAskMoment
): ProfileAskRecord {
  return moment === "card"
    ? { ...record, cardShown: true }
    : { ...record, bannersShown: record.bannersShown + 1 };
}
