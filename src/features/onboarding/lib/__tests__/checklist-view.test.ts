import { describe, expect, it } from "vitest";

import {
  CHECKLIST_ITEM_IDS,
  EMPTY_PROGRESS,
  type ChecklistItemId,
  type OnboardingProgress,
} from "../../model/onboarding-progress";
import {
  checklistRows,
  checklistSummary,
  tickAnnouncement,
  type TickState,
} from "../checklist-view";

const ITEMS = CHECKLIST_ITEM_IDS.map((id) => ({ id }));
const summary = (done: readonly ChecklistItemId[]) =>
  checklistSummary(ITEMS, done, "Get started");

describe("checklistSummary", () => {
  it("counts the tasks done, in the button's count and the panel's line", () => {
    expect(summary(["alerts", "compare"])).toEqual({
      doneCount: 2,
      total: 6,
      allDone: false,
      ratio: 2 / 6,
      count: "2/6",
      status: "2 of 6 tasks done",
      buttonLabel: "Get started: 2 of 6 tasks done",
    });
  });

  it("starts at none done", () => {
    expect(summary([])).toMatchObject({
      doneCount: 0,
      ratio: 0,
      count: "0/6",
      buttonLabel: "Get started: 0 of 6 tasks done",
    });
  });

  it("says when all tasks are done", () => {
    expect(summary(CHECKLIST_ITEM_IDS)).toMatchObject({
      doneCount: 6,
      allDone: true,
      ratio: 1,
      count: "6/6",
      status: "All tasks done",
      buttonLabel: "Get started: all tasks done",
    });
  });

  it("counts only the listed tasks, once each", () => {
    const listed = ITEMS.filter((i) => i.id !== "compare");
    const result = checklistSummary(
      listed,
      ["compare", "alerts", "alerts"],
      "Get started"
    );
    expect(result).toMatchObject({ doneCount: 1, total: 5, count: "1/5" });
  });

  it("is not all done with no tasks", () => {
    expect(checklistSummary([], [], "Get started")).toMatchObject({
      allDone: false,
      ratio: 0,
    });
  });
});

describe("checklistRows", () => {
  const items = [
    { id: "alerts", completion: "detected" },
    { id: "dashboard-pdf", completion: "manual" },
    { id: "compare", completion: "detected" },
  ] as const;
  const flags = (done: readonly ChecklistItemId[]) =>
    checklistRows(items, done).map((r) => ({
      id: r.item.id,
      done: r.done,
      showMe: r.canShowMe,
      markDone: r.canMarkDone,
    }));

  it("offers Show me on open tasks, and the tick only on the manual one", () => {
    expect(flags(["alerts"])).toEqual([
      { id: "alerts", done: true, showMe: false, markDone: false },
      { id: "dashboard-pdf", done: false, showMe: true, markDone: true },
      { id: "compare", done: false, showMe: true, markDone: false },
    ]);
  });

  it("offers nothing on the manual task once it is done", () => {
    expect(flags(["dashboard-pdf"])[1]).toEqual({
      id: "dashboard-pdf",
      done: true,
      showMe: false,
      markDone: false,
    });
  });
});

describe("tickAnnouncement", () => {
  const LABELS: Partial<Record<ChecklistItemId, string>> = {
    alerts: "Check recent alerts for an area",
    compare: "Compare two places",
    "own-area": "Draw or upload your own area",
  };
  const labelOf = (id: ChecklistItemId) => LABELS[id] ?? id;
  const at = (
    checklistDone: readonly ChecklistItemId[],
    over: Partial<OnboardingProgress> = {},
    hydrated = true
  ): TickState => ({
    hydrated,
    progress: {
      ...EMPTY_PROGRESS,
      tourOutcome: "completed",
      checklistDone,
      ...over,
    },
  });
  const say = (prev: TickState, next: TickState) =>
    tickAnnouncement(prev, next, labelOf, 6);

  it("names the task ticked and the count", () => {
    expect(say(at(["alerts"]), at(["alerts", "compare"]))).toBe(
      "Task done: Compare two places. 2 of 6 tasks done."
    );
  });

  it("names every task one change ticks", () => {
    expect(say(at([]), at(["compare", "own-area"]))).toBe(
      "Tasks done: Compare two places, Draw or upload your own area. 2 of 6 tasks done."
    );
  });

  it("says when the last task is done", () => {
    const five = CHECKLIST_ITEM_IDS.filter((id) => id !== "compare");
    expect(say(at(five), at([...five, "compare"]))).toBe(
      "Task done: Compare two places. All tasks done."
    );
  });

  it("says nothing when stored progress loads", () => {
    expect(say(at([], {}, false), at(["alerts"]))).toBeNull();
  });

  it("says nothing when nothing new is ticked", () => {
    expect(say(at(["alerts"]), at(["alerts"]))).toBeNull();
    expect(
      say(at(["alerts"]), at(["alerts"], { checklistDismissed: true }))
    ).toBeNull();
  });

  it("says nothing while the checklist is not offered", () => {
    expect(
      say(at([], { tourOutcome: null }), at(["alerts"], { tourOutcome: null }))
    ).toBeNull();
    expect(
      say(
        at([], { checklistDismissed: true }),
        at(["alerts"], { checklistDismissed: true })
      )
    ).toBeNull();
  });
});
