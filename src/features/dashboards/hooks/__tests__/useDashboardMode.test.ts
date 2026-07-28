import { describe, expect, it } from "vitest";

import { readModeFromSearch, searchWithMode } from "../useDashboardMode";

describe("readModeFromSearch", () => {
  it("reads an explicit mode", () => {
    expect(readModeFromSearch("?mode=report")).toBe("report");
    expect(readModeFromSearch("?mode=edit")).toBe("edit");
  });

  it("reads mode alongside other params", () => {
    expect(readModeFromSearch("?ff=dashboard&mode=report")).toBe("report");
  });

  it("returns null when absent", () => {
    expect(readModeFromSearch("")).toBeNull();
    expect(readModeFromSearch("?ff=dashboard")).toBeNull();
  });

  it("returns null for unknown values", () => {
    expect(readModeFromSearch("?mode=banana")).toBeNull();
    expect(readModeFromSearch("?mode=")).toBeNull();
  });
});

describe("searchWithMode", () => {
  it("sets mode on an empty search", () => {
    expect(searchWithMode("", "report")).toBe("?mode=report");
  });

  it("preserves other params — ff in particular", () => {
    expect(searchWithMode("?ff=dashboard", "report")).toBe(
      "?ff=dashboard&mode=report"
    );
  });

  it("replaces an existing mode", () => {
    expect(searchWithMode("?ff=dashboard&mode=report", "edit")).toBe(
      "?ff=dashboard&mode=edit"
    );
  });

  it("removes mode when null", () => {
    expect(searchWithMode("?ff=dashboard&mode=report", null)).toBe(
      "?ff=dashboard"
    );
    expect(searchWithMode("?mode=report", null)).toBe("");
  });
});
