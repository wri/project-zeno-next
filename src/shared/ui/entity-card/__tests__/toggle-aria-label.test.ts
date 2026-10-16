import { describe, expect, it } from "vitest";

import { toggleAriaLabel } from "../toggle-aria-label";

describe("toggleAriaLabel", () => {
  it("phrases a map switch as show / hide", () => {
    expect(toggleAriaLabel("map", "Tree cover loss", false)).toBe(
      "Show Tree cover loss on map"
    );
    expect(toggleAriaLabel("map", "Tree cover loss", true)).toBe(
      "Hide Tree cover loss from map"
    );
  });

  it("phrases a dashboard switch as add / remove", () => {
    expect(toggleAriaLabel("dashboard", "Loss in Pará", false)).toBe(
      "Add Loss in Pará to dashboard"
    );
    expect(toggleAriaLabel("dashboard", "Loss in Pará", true)).toBe(
      "Remove Loss in Pará from dashboard"
    );
  });

  it("uses a caller's own labels verbatim, by state", () => {
    const verb = {
      on: "Cancel adding Loss in Pará to dashboard",
      off: "Add Loss in Pará to dashboard",
    };
    expect(toggleAriaLabel(verb, "ignored", true)).toBe(verb.on);
    expect(toggleAriaLabel(verb, "ignored", false)).toBe(verb.off);
  });
});
