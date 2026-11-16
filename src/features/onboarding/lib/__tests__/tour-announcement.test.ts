import { describe, expect, it } from "vitest";

import {
  NO_ANNOUNCEMENT,
  nextAnnouncement,
  sentence,
  stepAnnouncement,
  type AnnouncementInput,
} from "../tour-announcement";

describe("sentence", () => {
  it("adds a full stop only where one is missing", () => {
    expect(sentence("Click Datasets")).toBe("Click Datasets.");
    expect(sentence("Waiting for your chart.")).toBe("Waiting for your chart.");
    expect(sentence("Click View Tree cover loss Analysis for …")).toBe(
      "Click View Tree cover loss Analysis for …"
    );
    expect(sentence("Ready? ")).toBe("Ready?");
  });
});

describe("stepAnnouncement", () => {
  it("says where the user is, the step, then its status", () => {
    expect(
      stepAnnouncement({
        stepNumber: 2,
        stepCount: 10,
        title: "Open the Data Catalog",
        status: "Your turn. Click Datasets.",
      })
    ).toBe("Step 2 of 10. Open the Data Catalog. Your turn. Click Datasets.");
  });

  it("names no step number for a one-step guide, and no status for an info step", () => {
    expect(
      stepAnnouncement({
        stepNumber: 1,
        stepCount: 1,
        title: "Compare two places",
        status: null,
      })
    ).toBe("Compare two places.");
  });
});

describe("nextAnnouncement", () => {
  const input = (over: Partial<AnnouncementInput> = {}): AnnouncementInput => ({
    stepKey: "tour:answer",
    stepNumber: 8,
    stepCount: 10,
    title: "Check the answer",
    status: "Waiting for the AI Assistant.",
    notice: null,
    ...over,
  });

  it("announces a new step whole, with the skipped-step notice", () => {
    const next = nextAnnouncement(
      NO_ANNOUNCEMENT,
      input({ notice: "We skipped a step. The chart did not load." })
    );
    expect(next.text).toBe(
      "Step 8 of 10. Check the answer. We skipped a step. The chart did not load. Waiting for the AI Assistant."
    );
  });

  it("then announces only a change of status", () => {
    const opened = nextAnnouncement(NO_ANNOUNCEMENT, input());
    const done = nextAnnouncement(
      opened,
      input({ status: "The answer is ready. Click Next." })
    );
    expect(done.text).toBe("The answer is ready. Click Next.");
  });

  it("changes nothing when called again with the same facts (StrictMode)", () => {
    const opened = nextAnnouncement(NO_ANNOUNCEMENT, input());
    expect(nextAnnouncement(opened, input())).toBe(opened);
    // The notice going away after a few seconds is not news either.
    const withNotice = nextAnnouncement(
      NO_ANNOUNCEMENT,
      input({ notice: "We skipped a step." })
    );
    expect(nextAnnouncement(withNotice, input({ notice: null }))).toBe(
      withNotice
    );
  });

  it("announces the next step whole, even with the same status", () => {
    const first = nextAnnouncement(NO_ANNOUNCEMENT, input());
    const second = nextAnnouncement(
      first,
      input({ stepKey: "tour:other", stepNumber: 9, title: "Check the chart" })
    );
    expect(second.text).toBe(
      "Step 9 of 10. Check the chart. Waiting for the AI Assistant."
    );
  });
});
