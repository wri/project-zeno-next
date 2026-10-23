import { describe, expect, it } from "vitest";
import {
  EMPTY_PROFILE_ASK_RECORD,
  NUDGE_CONVERSATIONS,
  recordAnswer,
  recordAskShown,
  type ProfileAskRecord,
} from "../profile-ask";

const NEW_CONVERSATION = true;
const SAME_CONVERSATION = false;

const afterCard: ProfileAskRecord = {
  lifetimeAnswers: 1,
  cardShown: true,
  bannersShown: 0,
};

describe("recordAnswer: when to ask", () => {
  it("asks with the card after the person's first answer ever", () => {
    const { record, ask } = recordAnswer(
      EMPTY_PROFILE_ASK_RECORD,
      NEW_CONVERSATION
    );
    expect(ask).toBe("card");
    expect(record).toEqual({ ...EMPTY_PROFILE_ASK_RECORD, lifetimeAnswers: 1 });
  });

  it("tries the card again when it couldn't be shown", () => {
    const missed = { ...EMPTY_PROFILE_ASK_RECORD, lifetimeAnswers: 1 };
    expect(recordAnswer(missed, SAME_CONVERSATION).ask).toBe("card");
  });

  it("doesn't ask again in the conversation the card was shown in", () => {
    expect(recordAnswer(afterCard, SAME_CONVERSATION).ask).toBeNull();
  });

  it("shows the banner after the first answer of the next new conversations", () => {
    let record = afterCard;
    for (let i = 0; i < NUDGE_CONVERSATIONS; i += 1) {
      const result = recordAnswer(record, NEW_CONVERSATION);
      expect(result.ask).toBe("banner");
      record = recordAskShown(result.record, "banner");
      // Later answers in that conversation bring nothing.
      expect(recordAnswer(record, SAME_CONVERSATION).ask).toBeNull();
    }
    expect(record.bannersShown).toBe(NUDGE_CONVERSATIONS);
    expect(recordAnswer(record, NEW_CONVERSATION).ask).toBeNull();
  });

  it("returns new records without changing the old one", () => {
    const before = { ...afterCard };
    recordAnswer(afterCard, NEW_CONVERSATION);
    recordAskShown(afterCard, "banner");
    expect(afterCard).toEqual(before);
  });
});

describe("recordAskShown", () => {
  it("marks the card shown", () => {
    expect(recordAskShown(EMPTY_PROFILE_ASK_RECORD, "card").cardShown).toBe(
      true
    );
  });

  it("counts banners", () => {
    expect(recordAskShown(afterCard, "banner").bannersShown).toBe(1);
  });
});
