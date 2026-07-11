import { describe, it, expect } from "vitest";

import {
  firstMessageRedirectPath,
  isAppRoute,
  mapTabHref,
} from "../threadNavigation";

describe("isAppRoute", () => {
  it("matches the app root and its subroutes", () => {
    expect(isAppRoute("/app")).toBe(true);
    expect(isAppRoute("/app/threads/t-1")).toBe(true);
  });

  it("rejects other surfaces and /app-prefixed lookalikes", () => {
    expect(isAppRoute("/dashboards/abc")).toBe(false);
    expect(isAppRoute("/application")).toBe(false);
    expect(isAppRoute(null)).toBe(false);
  });
});

describe("firstMessageRedirectPath", () => {
  it("rewrites to the thread URL from the app root", () => {
    expect(firstMessageRedirectPath("/app", "t-1")).toBe("/app/threads/t-1");
  });

  it("rewrites to the thread URL from app subroutes", () => {
    expect(firstMessageRedirectPath("/app/threads/old", "t-1")).toBe(
      "/app/threads/t-1"
    );
  });

  it("keeps the hidden-feature flags across the rewrite", () => {
    expect(firstMessageRedirectPath("/app", "t-1", "?ff=dashboard")).toBe(
      "/app/threads/t-1?ff=dashboard"
    );
  });

  it("keeps multi-flag ff values intact", () => {
    const path = firstMessageRedirectPath(
      "/app",
      "t-1",
      "?ff=dashboard,analysis"
    );
    expect(path).toBe("/app/threads/t-1?ff=dashboard%2Canalysis");
    // Round-trips through URLSearchParams to the original flag list.
    const query = new URLSearchParams(path!.split("?")[1]);
    expect(query.get("ff")).toBe("dashboard,analysis");
  });

  it("does not carry unrelated params across the rewrite", () => {
    expect(firstMessageRedirectPath("/app", "t-1", "?prompt=hello")).toBe(
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
