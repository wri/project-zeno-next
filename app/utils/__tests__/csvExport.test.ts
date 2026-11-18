import { describe, expect, it, vi } from "vitest";
import { csvFilename } from "../csvExport";

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
