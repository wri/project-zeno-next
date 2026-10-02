import { describe, expect, it, vi } from "vitest";
import { chartImageFilename } from "../exportChartImage";

describe("chartImageFilename", () => {
  it("sanitizes the title and appends a YYYYMMDD date stamp", () => {
    vi.useFakeTimers();

    try {
      vi.setSystemTime(new Date("2026-09-16T12:00:00Z"));
      expect(chartImageFilename("Land GHG flux over time")).toBe(
        "Land_GHG_flux_over_time_20260916.png"
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("falls back to 'chart' when there is no title", () => {
    expect(chartImageFilename(undefined)).toMatch(/^chart_\d{8}\.png$/);
  });
});
