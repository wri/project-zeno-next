import { describe, expect, it } from "vitest";

import {
  DEFAULT_ADVANCE_DELAY_MS,
  MISSING_TARGET_GRACE_MS,
  SHOW_RESULT_MS,
  advanceDelayMs,
  canSkipWhileWaiting,
  missingTargetExpired,
  passesOverAtEntry,
  stepKind,
  waitTick,
} from "../step-policy";
import type { TourStep } from "../tour";

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

describe("advanceDelayMs", () => {
  it("pauses briefly after an action, longer where a step asks", () => {
    expect(advanceDelayMs(step())).toBe(DEFAULT_ADVANCE_DELAY_MS);
    expect(advanceDelayMs(step({ advanceDelayMs: SHOW_RESULT_MS }))).toBe(
      SHOW_RESULT_MS
    );
    expect(SHOW_RESULT_MS).toBeGreaterThan(DEFAULT_ADVANCE_DELAY_MS);
  });
});
