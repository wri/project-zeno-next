import { describe, expect, it } from "vitest";

import type { StepStatusFacts } from "../../model/step-policy";
import type { TourStep } from "../../model/tour";
import { skippedNotice, stepStatus } from "../status-copy";
import { BLOCKED_NOTE_SKIPPABLE, BLOCKED_NOTE_TOMORROW } from "../tour-content";

const yes = () => true;
const no = () => false;
const action: TourStep<unknown> = {
  id: "a",
  title: "a",
  body: null,
  waitFor: no,
  hint: "Click Datasets",
};
const appWait: TourStep<unknown> = {
  id: "w",
  title: "w",
  body: null,
  waitFor: no,
  waitsOnApp: true,
  autoAdvance: false,
  hint: "Waiting for your chart.",
  readyHint: "Your chart is ready. Click Next.",
};
const info: TourStep<unknown> = { id: "i", title: "i", body: null };

const waiting: Omit<StepStatusFacts, "kind"> = {
  awaitingAction: true,
  waitedLong: false,
  completing: false,
  failed: false,
  asked: false,
  blocked: false,
};

describe("stepStatus", () => {
  it("has nothing to say on an info step", () => {
    expect(stepStatus(info, { ...waiting, awaitingAction: false })).toBeNull();
  });

  it("gives every status words, not only a colour", () => {
    const cases: [TourStep<unknown>, Partial<typeof waiting>, string][] = [
      [action, {}, "Your turn. Click Datasets."],
      [action, { completing: true }, "Done. The next step opens soon."],
      [
        { ...action, blockedNote: BLOCKED_NOTE_SKIPPABLE },
        { blocked: true },
        "No daily prompts left. Click Skip step.",
      ],
      [appWait, {}, "Waiting for your chart."],
      [
        appWait,
        { waitedLong: true },
        "This is taking a long time. You can wait, or click Skip step.",
      ],
      [
        appWait,
        { awaitingAction: false, completing: true },
        "Your chart is ready. Click Next.",
      ],
      [
        appWait,
        { awaitingAction: false, completing: true, failed: true },
        "The AI Assistant could not finish this answer. The chat shows what went wrong.",
      ],
      [
        appWait,
        { awaitingAction: false, completing: true, failed: true, asked: true },
        "The AI Assistant has a question for you.",
      ],
      [
        { ...info, blockedNote: BLOCKED_NOTE_TOMORROW },
        { awaitingAction: false, blocked: true },
        "No daily prompts left. You can do this task tomorrow.",
      ],
    ];
    for (const [step, over, text] of cases)
      expect(stepStatus(step, { ...waiting, ...over })?.text).toBe(text);
  });

  it("falls back to plain words when a step gives no hint", () => {
    const bare = { ...appWait, hint: undefined, readyHint: undefined };
    expect(stepStatus(bare, waiting)?.text).toBe("Waiting.");
    expect(
      stepStatus(bare, { ...waiting, awaitingAction: false, completing: true })
        ?.text
    ).toBe("Done. Click Next.");
    expect(stepStatus({ ...action, hint: undefined }, waiting)?.text).toBe(
      "Your turn. Use the highlighted control."
    );
  });

  it("carries the tone the bar draws and the ring pulses for", () => {
    expect(stepStatus(action, waiting)?.tone).toBe("turn");
    expect(
      stepStatus(
        { ...action, blockedIf: yes, blockedNote: BLOCKED_NOTE_SKIPPABLE },
        { ...waiting, blocked: true }
      )?.tone
    ).toBe("blocked");
  });
});

describe("skippedNotice", () => {
  it("says nothing when no step was passed over", () => {
    expect(skippedNotice([])).toBeNull();
  });

  it("says how many steps, and why", () => {
    expect(skippedNotice([{ note: "The chart did not load." }])).toBe(
      "We skipped a step. The chart did not load."
    );
    expect(
      skippedNotice([
        { note: "There is no area on the map" },
        { note: "There is no chart to read." },
      ])
    ).toBe("We skipped 2 steps. There is no area on the map.");
  });

  it("gives the first reason, even after a step that gave none", () => {
    expect(skippedNotice([{ note: null }, { note: "Why." }])).toBe(
      "We skipped 2 steps. Why."
    );
    expect(skippedNotice([{ note: null }])).toBe("We skipped a step.");
  });
});
