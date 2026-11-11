import { describe, expect, it } from "vitest";

import {
  CHECKLIST_ITEM_IDS,
  type ChecklistItemId,
} from "../../model/onboarding-progress";
import { checklistSummary } from "../checklist-view";

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
