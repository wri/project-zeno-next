import { describe, expect, it } from "vitest";
import {
  EMPTY_PROFILE_ASK_RECORD,
  MAX_PROFILE_DISMISSALS,
  NTH_QUESTION_ASK,
  recordAnswer,
  recordAskDismissed,
  recordAskShown,
  startNewSession,
  type ProfileAskRecord,
} from "../profile-ask";

const answer = (record: ProfileAskRecord, profileComplete = false) =>
  recordAnswer(record, profileComplete);

/** A later session: past answers, nothing asked yet this session. */
const laterSession = (fields: Partial<ProfileAskRecord> = {}) => ({
  ...EMPTY_PROFILE_ASK_RECORD,
  lifetimeAnswers: 7,
  ...fields,
});

describe("recordAnswer: when to ask", () => {
  it("asks with the card after the person's first answer ever", () => {
    const { record, ask } = answer(EMPTY_PROFILE_ASK_RECORD);
    expect(ask).toBe("first_answer");
    expect(record).toEqual({
      dismissals: 0,
      lifetimeAnswers: 1,
      askedThisSession: false,
      sessionAnswers: 1,
    });
  });

  it("doesn't treat the first answer of a later session as the first answer", () => {
    expect(answer(laterSession()).ask).toBeNull();
  });

  it("asks with the banner at the nth answer of a session", () => {
    const fourth = laterSession({ sessionAnswers: NTH_QUESTION_ASK - 1 });
    expect(answer(fourth).ask).toBe("nth_question");
  });

  it("doesn't ask between the moments", () => {
    const first = recordAskShown(answer(EMPTY_PROFILE_ASK_RECORD).record);
    expect(answer(first).ask).toBeNull();
    expect(
      answer(laterSession({ sessionAnswers: NTH_QUESTION_ASK })).ask
    ).toBeNull();
  });

  it("asks at most once per session", () => {
    const asked = recordAskShown(
      laterSession({ sessionAnswers: NTH_QUESTION_ASK - 1 })
    );
    expect(answer(asked).ask).toBeNull();
    expect(
      answer({ ...EMPTY_PROFILE_ASK_RECORD, askedThisSession: true }).ask
    ).toBeNull();
  });

  it("asks again in a new session after a dismissal", () => {
    const dismissed = recordAskDismissed(
      recordAskShown(laterSession({ sessionAnswers: 3 }))
    );
    const nextSession = startNewSession(dismissed);
    const fourth = { ...nextSession, sessionAnswers: NTH_QUESTION_ASK - 1 };
    expect(answer(fourth).ask).toBe("nth_question");
  });

  it(`stops asking after ${MAX_PROFILE_DISMISSALS} dismissals`, () => {
    let record = EMPTY_PROFILE_ASK_RECORD;
    for (let i = 0; i < MAX_PROFILE_DISMISSALS; i++) {
      record = recordAskDismissed(record);
    }
    expect(record.dismissals).toBe(MAX_PROFILE_DISMISSALS);
    expect(answer(record).ask).toBeNull();
    expect(
      answer({ ...record, sessionAnswers: NTH_QUESTION_ASK - 1 }).ask
    ).toBeNull();
  });

  it("never asks once the profile is complete, but still counts", () => {
    const { record, ask } = answer(EMPTY_PROFILE_ASK_RECORD, true);
    expect(ask).toBeNull();
    expect(record.lifetimeAnswers).toBe(1);
  });

  it("doesn't record the ask itself; that waits until something is shown", () => {
    expect(answer(EMPTY_PROFILE_ASK_RECORD).record.askedThisSession).toBe(
      false
    );
    expect(recordAskShown(EMPTY_PROFILE_ASK_RECORD).askedThisSession).toBe(
      true
    );
  });
});

describe("startNewSession", () => {
  it("keeps lifetime counts and resets the session state", () => {
    expect(
      startNewSession({
        dismissals: 1,
        lifetimeAnswers: 9,
        askedThisSession: true,
        sessionAnswers: 4,
      })
    ).toEqual({
      dismissals: 1,
      lifetimeAnswers: 9,
      askedThisSession: false,
      sessionAnswers: 0,
    });
  });
});
