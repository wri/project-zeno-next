import { describe, expect, it, vi } from "vitest";
import { rowsToCsv, csvFilename } from "../csvExport";

describe("rowsToCsv", () => {
  it("joins headers and rows with commas", () => {
    const csv = rowsToCsv([{ a: 1, b: "x" }], ["a", "b"]);
    expect(csv).toBe("a,b\n1,x");
  });

  it("quotes cells containing a comma, quote, or newline", () => {
    const csv = rowsToCsv(
      [{ a: 'has "quote"', b: "a,b", c: "line1\nline2" }],
      ["a", "b", "c"]
    );
    expect(csv).toBe('a,b,c\n"has ""quote""","a,b","line1\nline2"');
  });

  it("renders null/undefined cells as empty", () => {
    const csv = rowsToCsv([{ a: null, b: undefined }], ["a", "b"]);
    expect(csv).toBe("a,b\n,");
  });

  it("reads each header's value from a different row key when given rowKeys", () => {
    const csv = rowsToCsv([{ raw_key: 42 }], ["Renamed Header"], ["raw_key"]);
    expect(csv).toBe("Renamed Header\n42");
  });
});

describe("csvFilename", () => {
  it("sanitizes the title and appends a YYYYMMDD date stamp", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-16T12:00:00Z"));
    expect(csvFilename("Land GHG flux over time")).toBe(
      "Land_GHG_flux_over_time_20260916.csv"
    );
    vi.useRealTimers();
  });

  it("falls back to 'data' when there is no title", () => {
    expect(csvFilename(undefined)).toMatch(/^data_\d{8}\.csv$/);
  });
});
