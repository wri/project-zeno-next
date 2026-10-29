import { describe, expect, it } from "vitest";
import { isView, pageHref } from "../links";

describe("pageHref", () => {
  it("drops defaults and keeps run, use case and anchor", () => {
    expect(pageHref({})).toBe("/ai-accuracy-scorecards");
    expect(pageHref({ view: "dashboard", run: "r1" })).toBe(
      "/ai-accuracy-scorecards?run=r1"
    );
    expect(pageHref({ view: "questions", run: "r1", useCase: "UC2" })).toBe(
      "/ai-accuracy-scorecards?view=questions&run=r1&uc=UC2"
    );
    expect(pageHref({ view: "methodology", hash: "question-types" })).toBe(
      "/ai-accuracy-scorecards?view=methodology#question-types"
    );
  });

  it("recognises only the three views", () => {
    // The checks moved into the methodology; the screen maps old links.
    expect(
      ["dashboard", "questions", "methodology", "checks", "runs", null].map(
        isView
      )
    ).toEqual([true, true, true, false, false, false]);
  });
});
