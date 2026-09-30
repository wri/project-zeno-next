import { describe, expect, it } from "vitest";
import {
  EMPTY_PROFILE_ASK_RECORD,
  INITIAL_PROFILE_ASK_STATE,
  MAX_PROFILE_DISMISSALS,
  NTH_QUESTION_ASK,
  askMomentAfterAnswer,
  profileAskState,
  recordAnswer,
  recordAskDismissed,
  recordAskShown,
  recordProfileAsked,
  recordProfileCompleted,
  recordProfileDismissed,
  shouldAskForProfile,
  showProfileMenuReminder,
  startNewSession,
  type ProfileAskRecord,
  type ProfileAskState,
} from "../profile-ask";

const fresh: ProfileAskState = INITIAL_PROFILE_ASK_STATE;

describe("shouldAskForProfile", () => {
  it("never asks on entry, even for a brand-new person", () => {
    expect(shouldAskForProfile(fresh, "entry")).toBe(false);
  });

  it("asks after the first answer when nothing has been asked yet", () => {
    expect(shouldAskForProfile(fresh, "first_answer")).toBe(true);
  });

  it("asks at most once per session", () => {
    const asked = recordProfileAsked(fresh);
    expect(shouldAskForProfile(asked, "nth_question")).toBe(false);
    expect(shouldAskForProfile(asked, "quota_low")).toBe(false);
  });

  it("asks again in a new session after a dismissal", () => {
    const dismissed = recordProfileDismissed(recordProfileAsked(fresh));
    expect(
      shouldAskForProfile(startNewSession(dismissed), "nth_question")
    ).toBe(true);
  });

  it(`stops asking after ${MAX_PROFILE_DISMISSALS} dismissals`, () => {
    let state = fresh;
    for (let i = 0; i < MAX_PROFILE_DISMISSALS; i++) {
      state = recordProfileDismissed(state);
    }
    expect(shouldAskForProfile(state, "saved_item")).toBe(false);
    expect(showProfileMenuReminder(state)).toBe(true);
  });

  it("never asks once the profile is complete", () => {
    const done = recordProfileCompleted(fresh);
    expect(shouldAskForProfile(done, "first_answer")).toBe(false);
    expect(showProfileMenuReminder(done)).toBe(false);
  });
});

describe("askMomentAfterAnswer", () => {
  it("asks after the person's first ever answer", () => {
    expect(askMomentAfterAnswer({ lifetime: 1, session: 1 })).toBe(
      "first_answer"
    );
  });

  it("doesn't treat the first answer of a later session as the first answer", () => {
    expect(askMomentAfterAnswer({ lifetime: 8, session: 1 })).toBeNull();
  });

  it("asks at the nth answer of a session", () => {
    expect(
      askMomentAfterAnswer({ lifetime: 12, session: NTH_QUESTION_ASK })
    ).toBe("nth_question");
  });

  it("returns null for answers in between", () => {
    expect(askMomentAfterAnswer({ lifetime: 2, session: 2 })).toBeNull();
    expect(
      askMomentAfterAnswer({ lifetime: 20, session: NTH_QUESTION_ASK + 1 })
    ).toBeNull();
  });
});

describe("startNewSession", () => {
  it("keeps lifetime counts and resets the session flag", () => {
    const state = startNewSession(
      recordProfileDismissed(recordProfileAsked(fresh))
    );
    expect(state).toEqual({
      profileComplete: false,
      dismissals: 1,
      askedThisSession: false,
    });
  });
});

describe("recordAnswer (the per-person record)", () => {
  const answer = (record: ProfileAskRecord, profileComplete = false) =>
    recordAnswer(record, profileComplete);

  it("asks with the card after the first answer ever", () => {
    const { record, ask } = answer(EMPTY_PROFILE_ASK_RECORD);
    expect(ask).toBe("first_answer");
    expect(record).toEqual({
      dismissals: 0,
      lifetimeAnswers: 1,
      askedThisSession: false,
      sessionAnswers: 1,
    });
  });

  it("doesn't record the ask itself; that waits until something is shown", () => {
    expect(answer(EMPTY_PROFILE_ASK_RECORD).record.askedThisSession).toBe(
      false
    );
    expect(recordAskShown(EMPTY_PROFILE_ASK_RECORD).askedThisSession).toBe(
      true
    );
  });

  it("doesn't ask after the second answer", () => {
    const first = recordAskShown(answer(EMPTY_PROFILE_ASK_RECORD).record);
    expect(answer(first).ask).toBeNull();
  });

  it("asks with the banner at the fifth answer of a later session", () => {
    const later: ProfileAskRecord = {
      dismissals: 1,
      lifetimeAnswers: 7,
      askedThisSession: false,
      sessionAnswers: NTH_QUESTION_ASK - 1,
    };
    expect(answer(later).ask).toBe("nth_question");
    expect(answer({ ...later, sessionAnswers: 0 }).ask).toBeNull();
    expect(answer({ ...later, sessionAnswers: NTH_QUESTION_ASK }).ask).toBe(
      null
    );
  });

  it("asks at most once per session", () => {
    const asked: ProfileAskRecord = {
      dismissals: 0,
      lifetimeAnswers: 0,
      askedThisSession: true,
      sessionAnswers: 0,
    };
    expect(answer(asked).ask).toBeNull();
    expect(
      answer({ ...asked, lifetimeAnswers: 3, sessionAnswers: 4 }).ask
    ).toBeNull();
  });

  it("stops asking after the maximum number of dismissals", () => {
    let record = EMPTY_PROFILE_ASK_RECORD;
    for (let i = 0; i < MAX_PROFILE_DISMISSALS; i++) {
      record = recordAskDismissed(record);
    }
    expect(record.dismissals).toBe(MAX_PROFILE_DISMISSALS);
    expect(answer(record).ask).toBeNull();
    expect(answer({ ...record, sessionAnswers: 4 }).ask).toBeNull();
  });

  it("never asks once the profile is complete, but still counts", () => {
    const { record, ask } = answer(EMPTY_PROFILE_ASK_RECORD, true);
    expect(ask).toBeNull();
    expect(record.lifetimeAnswers).toBe(1);
  });

  it("maps a record onto the policy's state", () => {
    expect(
      profileAskState(
        {
          dismissals: 2,
          lifetimeAnswers: 9,
          askedThisSession: true,
          sessionAnswers: 3,
        },
        false
      )
    ).toEqual({
      profileComplete: false,
      dismissals: 2,
      askedThisSession: true,
    });
  });
});
