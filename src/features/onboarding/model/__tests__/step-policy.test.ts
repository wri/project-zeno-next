import { describe, expect, it } from "vitest";

import {
  DEFAULT_ADVANCE_DELAY_MS,
  MISSING_TARGET_GRACE_MS,
  SHOW_RESULT_MS,
  advanceDelayMs,
  canSkipWhileWaiting,
  docksOnTargetClick,
  isTypingTarget,
  missingTargetExpired,
  passesOverAtEntry,
  stepKind,
  stepStatusTone,
  waitStartedAgain,
  waitTick,
  type StepStatusFacts,
} from "../step-policy";
import { anchorTarget, type TourStep } from "../tour";

const step = (extra: Partial<TourStep<unknown>> = {}): TourStep<unknown> => ({
  id: "s",
  title: "s",
  body: null,
  ...extra,
});
const yes = () => true;
const no = () => false;

describe("stepKind", () => {
  it("tells the three kinds apart", () => {
    expect(stepKind(step())).toBe("info");
    expect(stepKind(step({ waitFor: no }))).toBe("action");
    expect(stepKind(step({ waitFor: no, waitsOnApp: true }))).toBe("app-wait");
  });
});

describe("passesOverAtEntry", () => {
  it("passes over a step whose skipIf holds", () => {
    expect(passesOverAtEntry(step({ skipIf: yes }))).toBe(true);
    expect(passesOverAtEntry(step({ skipIf: no }))).toBe(false);
  });

  it("passes over a wait on the app that is already done", () => {
    expect(passesOverAtEntry(step({ waitFor: yes, waitsOnApp: true }))).toBe(
      true
    );
    expect(passesOverAtEntry(step({ waitFor: no, waitsOnApp: true }))).toBe(
      false
    );
  });

  it("shows a done wait that asks to be read, and a done user action", () => {
    expect(
      passesOverAtEntry(
        step({ waitFor: yes, waitsOnApp: true, autoAdvance: false })
      )
    ).toBe(false);
    // Back to an action already done shows Next instead.
    expect(passesOverAtEntry(step({ waitFor: yes }))).toBe(false);
  });
});

describe("canSkipWhileWaiting", () => {
  it("always lets the user skip an action", () => {
    expect(canSkipWhileWaiting(step({ waitFor: no }), false)).toBe(true);
  });

  it("lets the user skip a wait on the app only after a while", () => {
    const appWait = step({ waitFor: no, waitsOnApp: true });
    expect(canSkipWhileWaiting(appWait, false)).toBe(false);
    expect(canSkipWhileWaiting(appWait, true)).toBe(true);
  });
});

describe("waitTick", () => {
  it("keeps waiting until waitFor passes", () => {
    expect(waitTick(step({ waitFor: no }))).toBe("wait");
  });

  it("moves on, or shows Next when the step asks to be read", () => {
    expect(waitTick(step({ waitFor: yes }))).toBe("advance");
    expect(waitTick(step({ waitFor: yes, autoAdvance: false }))).toBe("unlock");
  });

  it("passes the step over when skipIf holds, even once the wait is done", () => {
    // E.g. the answer settled, but as a failure: not "the answer is here".
    expect(
      waitTick(step({ waitFor: yes, autoAdvance: false, skipIf: yes }))
    ).toBe("skip");
    expect(waitTick(step({ waitFor: no, skipIf: yes }))).toBe("skip");
  });
});

describe("missingTargetExpired", () => {
  const graceMs = MISSING_TARGET_GRACE_MS;

  it("gives a missing target the grace period from when it went missing", () => {
    const missingSince = 10_000;
    expect(
      missingTargetExpired({
        now: missingSince + graceMs - 1,
        missingSince,
        graceMs,
      })
    ).toBe(false);
    expect(
      missingTargetExpired({
        now: missingSince + graceMs,
        missingSince,
        graceMs,
      })
    ).toBe(true);
  });
});

describe("stepStatusTone", () => {
  const facts = (over: Partial<StepStatusFacts>): StepStatusFacts => ({
    kind: "action",
    awaitingAction: true,
    waitedLong: false,
    completing: false,
    failed: false,
    asked: false,
    blocked: false,
    ...over,
  });

  it("says nothing on an info step, or once a wait is over with nothing to report", () => {
    expect(stepStatusTone(facts({ kind: "info", awaitingAction: false }))).toBe(
      "none"
    );
    // Back to an action already done, before the step's own facts change.
    expect(stepStatusTone(facts({ awaitingAction: false }))).toBe("none");
  });

  it("is the user's turn on an action, a wait on a wait on the app", () => {
    expect(stepStatusTone(facts({}))).toBe("turn");
    expect(stepStatusTone(facts({ kind: "app-wait" }))).toBe("wait");
    expect(stepStatusTone(facts({ kind: "app-wait", waitedLong: true }))).toBe(
      "slow"
    );
  });

  it("is slow only for a wait on the app: an action never says so", () => {
    expect(stepStatusTone(facts({ waitedLong: true }))).toBe("turn");
  });

  it("follows blocked > asked > failed > done > slow > wait > turn", () => {
    const all = facts({
      kind: "app-wait",
      waitedLong: true,
      completing: true,
      failed: true,
      asked: true,
      blocked: true,
    });
    expect(stepStatusTone(all)).toBe("blocked");
    expect(stepStatusTone({ ...all, blocked: false })).toBe("asked");
    expect(stepStatusTone({ ...all, blocked: false, asked: false })).toBe(
      "failed"
    );
    expect(
      stepStatusTone({ ...all, blocked: false, asked: false, failed: false })
    ).toBe("done");
  });

  it("is done once the wait is over, moving on or showing Next", () => {
    expect(stepStatusTone(facts({ completing: true }))).toBe("done");
    expect(
      stepStatusTone(
        facts({ kind: "app-wait", awaitingAction: false, completing: true })
      )
    ).toBe("done");
  });

  it("says blocked even on a step that waits for nothing (a guide)", () => {
    expect(
      stepStatusTone(
        facts({ kind: "info", awaitingAction: false, blocked: true })
      )
    ).toBe("blocked");
  });
});

describe("waitStartedAgain", () => {
  const appWait = step({ waitFor: no, waitsOnApp: true, autoAdvance: false });

  it("holds once a wait on the app that was over is not done any more", () => {
    // The user answered a question asked back: a new answer is coming.
    expect(
      waitStartedAgain(appWait, { waitOver: true, waitDoneNow: false })
    ).toBe(true);
    expect(
      waitStartedAgain(appWait, { waitOver: true, waitDoneNow: true })
    ).toBe(false);
  });

  it("is not a wait starting again before the first one is over", () => {
    expect(
      waitStartedAgain(appWait, { waitOver: false, waitDoneNow: false })
    ).toBe(false);
  });

  it("never applies to the user's actions or to info steps", () => {
    expect(
      waitStartedAgain(step({ waitFor: no }), {
        waitOver: true,
        waitDoneNow: false,
      })
    ).toBe(false);
    expect(
      waitStartedAgain(step(), { waitOver: true, waitDoneNow: false })
    ).toBe(false);
  });
});

describe("docksOnTargetClick", () => {
  const target = anchorTarget("chat-panel");

  it("docks a step with a target and nothing to wait for", () => {
    expect(docksOnTargetClick(step({ target }), false)).toBe(true);
    // An answer that is in: Next shows, the chat is the user's.
    expect(
      docksOnTargetClick(
        step({ target, waitFor: yes, waitsOnApp: true, autoAdvance: false }),
        false
      )
    ).toBe(true);
  });

  it("never docks while the step waits for the user's action", () => {
    expect(docksOnTargetClick(step({ target, waitFor: no }), true)).toBe(false);
  });

  it("never docks a step without a target", () => {
    expect(docksOnTargetClick(step(), false)).toBe(false);
  });
});

describe("isTypingTarget", () => {
  const el = (tagName: string, isContentEditable = false) => ({
    tagName,
    isContentEditable,
  });

  it("is typing in a text field, a list box or editable text", () => {
    expect(isTypingTarget(el("INPUT"))).toBe(true);
    expect(isTypingTarget(el("TEXTAREA"))).toBe(true);
    expect(isTypingTarget(el("SELECT"))).toBe(true);
    expect(isTypingTarget(el("div", true))).toBe(true);
    // Lower case, as in XHTML or SVG documents.
    expect(isTypingTarget(el("input"))).toBe(true);
  });

  it("is not typing on a button, the page or nothing", () => {
    expect(isTypingTarget(el("BUTTON"))).toBe(false);
    expect(isTypingTarget(el("BODY"))).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });
});

describe("advanceDelayMs", () => {
  it("pauses briefly after an action, longer where a step asks", () => {
    expect(advanceDelayMs(step())).toBe(DEFAULT_ADVANCE_DELAY_MS);
    expect(advanceDelayMs(step({ advanceDelayMs: SHOW_RESULT_MS }))).toBe(
      SHOW_RESULT_MS
    );
    expect(SHOW_RESULT_MS).toBeGreaterThan(DEFAULT_ADVANCE_DELAY_MS);
  });
});
