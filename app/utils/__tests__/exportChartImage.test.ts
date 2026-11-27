// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { chartImageFilename, cloneForExport } from "../exportChartImage";

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

describe("cloneForExport", () => {
  it("leaves out elements marked data-export-exclude and keeps the rest", () => {
    const container = document.createElement("div");
    container.innerHTML =
      "<p>Showing 11–20 of 47</p>" +
      '<div data-export-exclude=""><button>Previous</button><button>Next</button></div>' +
      "<span>bars</span>";
    const clone = cloneForExport(container);

    expect(clone.querySelector("button")).toBeNull();
    expect(clone.textContent).toBe("Showing 11–20 of 47bars");
    // The page's own chart keeps its buttons.
    expect(container.querySelectorAll("button")).toHaveLength(2);
  });
});
