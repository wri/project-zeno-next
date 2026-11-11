import { describe, expect, it } from "vitest";

import { startTourHref } from "../tour-entry";

describe("startTourHref", () => {
  it("keeps the feature flags and adds the start param", () => {
    expect(startTourHref("?ff=onboarding,dashboard")).toBe(
      "/app?ff=onboarding%2Cdashboard&tour=1"
    );
  });

  it("drops everything else, so a landing prompt isn't re-sent", () => {
    expect(startTourHref("?ff=onboarding&prompt=hello&x=1")).toBe(
      "/app?ff=onboarding&tour=1"
    );
  });

  it("works without any flags", () => {
    expect(startTourHref("")).toBe("/app?tour=1");
  });
});
