import { describe, it, expect } from "vitest";

import { firstMessageRedirectPath, mapTabHref } from "../threadNavigation";

describe("firstMessageRedirectPath", () => {
  it("rewrites to the thread URL from the app root", () => {
    expect(firstMessageRedirectPath("/app", "t-1")).toBe("/app/threads/t-1");
  });

  it("rewrites to the thread URL from app subroutes", () => {
    expect(firstMessageRedirectPath("/app/threads/old", "t-1")).toBe(
      "/app/threads/t-1"
    );
  });

  it("stays put on a dashboard page", () => {
    expect(firstMessageRedirectPath("/dashboards/abc", "t-1")).toBeNull();
  });

  it("does not treat /apple-like prefixes as the app surface", () => {
    expect(firstMessageRedirectPath("/application", "t-1")).toBeNull();
  });

  it("stays put when the pathname is unknown", () => {
    expect(firstMessageRedirectPath(null, "t-1")).toBeNull();
  });
});

describe("mapTabHref", () => {
  it("links to the live thread when a conversation is under way", () => {
    expect(mapTabHref("t-1")).toBe("/app/threads/t-1?ff=dashboard");
  });

  it("links to the resetting new-thread page when idle", () => {
    expect(mapTabHref(null)).toBe("/app?ff=dashboard");
  });
});
