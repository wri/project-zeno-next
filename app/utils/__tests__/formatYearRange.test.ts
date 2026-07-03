import { describe, it, expect } from "vitest";
import { buildYearParam } from "../formatYearRange";

describe("buildYearParam", () => {
  it("collapses equal bounds to a single YEAR", () => {
    expect(buildYearParam(2020, 2020)).toEqual({
      label: "YEAR",
      value: "2020",
    });
  });

  it("formats differing bounds as a YEARS range with a 2-digit end year", () => {
    expect(buildYearParam(2020, 2023)).toEqual({
      label: "YEARS",
      value: "2020–23",
    });
  });

  it("parses the year from ISO date strings", () => {
    expect(buildYearParam("2001-01-01", "2025-12-31")).toEqual({
      label: "YEARS",
      value: "2001–25",
    });
  });

  it("returns undefined when a bound is missing", () => {
    expect(buildYearParam(2020, undefined)).toBeUndefined();
    expect(buildYearParam(null, 2023)).toBeUndefined();
  });

  it("returns undefined when a bound is unparseable", () => {
    expect(buildYearParam("not-a-date", "2023")).toBeUndefined();
  });
});
