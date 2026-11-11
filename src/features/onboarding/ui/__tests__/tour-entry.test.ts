import { describe, expect, it } from "vitest";

import { shouldStartTour, startTourHref } from "../tour-entry";

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

describe("shouldStartTour", () => {
  const fresh = {
    pathname: "/app",
    firstVisit: true,
    conversationStarted: false,
  };
  const at = (search: string, overrides: Partial<typeof fresh> = {}) =>
    shouldStartTour({
      ...fresh,
      ...overrides,
      params: new URLSearchParams(search),
    });

  it("starts by itself on a first visit to a fresh conversation", () => {
    expect(at("?ff=onboarding")).toBe(true);
  });

  it("doesn't start by itself while a landing prompt is being answered", () => {
    expect(at("?ff=onboarding&prompt=Forest%20loss%20in%20Kenya")).toBe(false);
  });

  it("starts by itself on the next plain visit, as no outcome was recorded", () => {
    expect(at("?prompt=hi")).toBe(false);
    expect(at("")).toBe(true);
  });

  it("starts when asked, on a first visit or not", () => {
    expect(at("?tour=1", { firstVisit: false })).toBe(true);
    expect(at("?tour=1")).toBe(true);
  });

  it("doesn't start by itself once the first-run tour has an outcome", () => {
    expect(at("", { firstVisit: false })).toBe(false);
  });

  it("starts only on a fresh conversation, even when asked", () => {
    expect(at("", { pathname: "/app/threads/t-1" })).toBe(false);
    expect(at("?tour=1", { pathname: "/app/threads/t-1" })).toBe(false);
    expect(at("", { conversationStarted: true })).toBe(false);
    expect(at("?tour=1", { conversationStarted: true })).toBe(false);
  });
});
