import { describe, expect, it } from "vitest";

import {
  focusInstead,
  holdsKeyboard,
  mayHoldFocus,
  tabFromEdge,
  type FocusPlace,
  type TabEdge,
} from "../keyboard-reach";

const place = (over: Partial<FocusPlace>): FocusPlace => ({
  inPopover: false,
  inTarget: false,
  inPage: true,
  ...over,
});

const edge = (over: Partial<TabEdge>): TabEdge => ({
  backward: false,
  atTargetStart: false,
  atTargetEnd: false,
  atPopoverStart: false,
  ...over,
});

describe("holdsKeyboard", () => {
  it("holds the keyboard while the step shows in full", () => {
    expect(holdsKeyboard({ docked: false })).toBe(true);
  });

  it("lets it go once the step is docked: the app is the user's again", () => {
    expect(holdsKeyboard({ docked: true })).toBe(false);
  });
});

describe("mayHoldFocus", () => {
  it("keeps a dimmed control in the page out of reach", () => {
    expect(mayHoldFocus(place({}))).toBe(false);
  });

  it("lets the lit target and anything inside it take focus", () => {
    expect(mayHoldFocus(place({ inTarget: true }))).toBe(true);
  });

  it("lets the popover take focus, Close tour included", () => {
    expect(mayHoldFocus(place({ inPopover: true, inPage: false }))).toBe(true);
  });

  it("lets a layer above the page take focus: a menu the target opened in a portal", () => {
    expect(mayHoldFocus(place({ inPage: false }))).toBe(true);
  });
});

describe("focusInstead", () => {
  it("sends Tab on a control before the target into the target", () => {
    expect(focusInstead({ by: "tab", beforeTarget: true })).toEqual([
      "target-first",
      "popover-first",
    ]);
  });

  it("sends Tab past the target, or with no target, to Close tour", () => {
    expect(focusInstead({ by: "tab", beforeTarget: false })).toEqual([
      "popover-first",
    ]);
  });

  it("sends Shift+Tab after the target back into it", () => {
    expect(focusInstead({ by: "shift-tab", beforeTarget: false })).toEqual([
      "target-last",
      "popover-last",
    ]);
  });

  it("wraps Shift+Tab before the target to the popover's last control", () => {
    expect(focusInstead({ by: "shift-tab", beforeTarget: true })).toEqual([
      "popover-last",
    ]);
  });

  it("undoes any other move, or falls back to the popover", () => {
    for (const beforeTarget of [true, false])
      expect(focusInstead({ by: "other", beforeTarget })).toEqual([
        "previous",
        "popover",
      ]);
  });
});

describe("tabFromEdge", () => {
  it("goes from the target's last stop to Close tour", () => {
    expect(tabFromEdge(edge({ atTargetEnd: true }))).toEqual(["popover-first"]);
  });

  it("goes from the target's first stop back to the popover's last", () => {
    expect(tabFromEdge(edge({ backward: true, atTargetStart: true }))).toEqual([
      "popover-last",
    ]);
  });

  it("goes from the popover's start back into the target, or round the popover", () => {
    expect(tabFromEdge(edge({ backward: true, atPopoverStart: true }))).toEqual(
      ["target-last", "popover-last"]
    );
  });

  it("goes both ways from a target with one stop", () => {
    const only = { atTargetStart: true, atTargetEnd: true };
    expect(tabFromEdge(edge(only))).toEqual(["popover-first"]);
    expect(tabFromEdge(edge({ ...only, backward: true }))).toEqual([
      "popover-last",
    ]);
  });

  it("leaves Tab on the popover's last control to the browser, so the page can be left", () => {
    expect(tabFromEdge(edge({}))).toBeNull();
    // Forward from the popover's start moves into the popover as usual.
    expect(tabFromEdge(edge({ atPopoverStart: true }))).toBeNull();
  });

  it("leaves moves inside the target to the browser", () => {
    expect(tabFromEdge(edge({ atTargetStart: true }))).toBeNull();
    expect(tabFromEdge(edge({ backward: true, atTargetEnd: true }))).toBeNull();
  });
});
