import { describe, expect, it } from "vitest";
import {
  INITIAL_PROFILE_ASK_STATE,
  MAX_PROFILE_DISMISSALS,
  NTH_QUESTION_ASK,
  askMomentAfterAnswer,
  recordProfileAsked,
  recordProfileCompleted,
  recordProfileDismissed,
  shouldAskForProfile,
  showProfileMenuReminder,
  startNewSession,
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
