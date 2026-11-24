import { describe, expect, it } from "vitest";
import {
  carryFlags,
  enabledFlags,
  isFeatureEnabled,
  withFlags,
} from "../feature-flags";

const params = (query: string) => new URLSearchParams(query);

describe("isFeatureEnabled", () => {
  it("is false when no ff param is present", () => {
    expect(isFeatureEnabled(params(""), "analysis")).toBe(false);
  });

  it("is true when the flag is the sole ff value", () => {
    expect(isFeatureEnabled(params("ff=analysis"), "analysis")).toBe(true);
  });

  it("is true when the flag is among comma-separated ff values", () => {
    expect(isFeatureEnabled(params("ff=foo,analysis,bar"), "analysis")).toBe(
      true
    );
  });

  it("ignores surrounding whitespace", () => {
    expect(isFeatureEnabled(params("ff=foo, analysis "), "analysis")).toBe(
      true
    );
  });

  it("is false when the flag is absent from ff", () => {
    expect(isFeatureEnabled(params("ff=foo,bar"), "analysis")).toBe(false);
  });
});

describe("enabledFlags", () => {
  it("is empty when no ff param is present", () => {
    expect(enabledFlags(params(""))).toEqual(new Set());
  });

  it("collects every comma-separated flag, trimmed", () => {
    expect(enabledFlags(params("ff=foo, analysis ,bar"))).toEqual(
      new Set(["foo", "analysis", "bar"])
    );
  });
});

describe("withFlags", () => {
  it("carries every flag onto the href", () => {
    expect(withFlags("/dashboards", params("ff=a,b&prompt=x"))).toBe(
      "/dashboards?ff=a%2Cb"
    );
  });

  it("leaves the href alone without flags", () => {
    expect(withFlags("/dashboards", params("prompt=x"))).toBe("/dashboards");
  });
});

describe("carryFlags", () => {
  const on = "?ff=email-subscriptions";

  it("adds the current flags to a path with no query", () => {
    expect(carryFlags("/dashboards", on)).toBe(
      "/dashboards?ff=email-subscriptions"
    );
  });

  it("encodes several flags the way withFlags does", () => {
    expect(carryFlags("/app", "?ff=a,b&prompt=x")).toBe("/app?ff=a%2Cb");
  });

  it("appends to an existing query without re-encoding it", () => {
    expect(carryFlags("/app?layers=a,b;sub=c&v=1", on)).toBe(
      "/app?layers=a,b;sub=c&v=1&ff=email-subscriptions"
    );
  });

  it("keeps the hash after the query", () => {
    expect(carryFlags("/scores?view=all#checks", on)).toBe(
      "/scores?view=all&ff=email-subscriptions#checks"
    );
    expect(carryFlags("/scores#checks", on)).toBe(
      "/scores?ff=email-subscriptions#checks"
    );
  });

  it("carries the flags onto a hash-only or query-only href", () => {
    expect(carryFlags("#use-cases", on)).toBe(
      "?ff=email-subscriptions#use-cases"
    );
    expect(carryFlags("?tab=x", on)).toBe("?tab=x&ff=email-subscriptions");
  });

  it("does not add a separator after an empty query or a trailing &", () => {
    expect(carryFlags("/app?", on)).toBe("/app?ff=email-subscriptions");
    expect(carryFlags("/app?a=1&", on)).toBe("/app?a=1&ff=email-subscriptions");
  });

  it("leaves an href that sets its own flags alone", () => {
    expect(carryFlags("/app?ff=voice", on)).toBe("/app?ff=voice");
  });

  it("leaves hrefs that leave the app alone", () => {
    expect(carryFlags("https://example.org/x", on)).toBe(
      "https://example.org/x"
    );
    expect(carryFlags("mailto:a@example.org", on)).toBe("mailto:a@example.org");
    expect(carryFlags("//example.org/x", on)).toBe("//example.org/x");
  });

  it("leaves the href alone when no flags are on", () => {
    expect(carryFlags("/dashboards", "?prompt=x")).toBe("/dashboards");
    expect(carryFlags("/dashboards", "")).toBe("/dashboards");
  });
});
