import { describe, expect, it } from "vitest";
import {
  dailySpan,
  fillMissingDays,
  formatDayTick,
  isDailyAxis,
} from "../dateAxis";

describe("isDailyAxis", () => {
  it("accepts YYYY-MM-DD days only", () => {
    expect(isDailyAxis([{ d: "2026-09-11" }, { d: "2026-09-12" }], "d")).toBe(
      true
    );
    expect(isDailyAxis([{ d: "2026-09" }], "d")).toBe(false);
    expect(isDailyAxis([{ d: 2026 }], "d")).toBe(false);
    expect(isDailyAxis([], "d")).toBe(false);
  });
});

describe("fillMissingDays", () => {
  it("inserts a bare row for each day the data omits", () => {
    const rows = [
      { d: "2026-09-11", high: 1 },
      { d: "2026-09-14", low: 2 },
    ];
    expect(fillMissingDays(rows, "d")).toEqual([
      { d: "2026-09-11", high: 1 },
      { d: "2026-09-12" },
      { d: "2026-09-13" },
      { d: "2026-09-14", low: 2 },
    ]);
  });

  it("crosses month and year boundaries", () => {
    const filled = fillMissingDays(
      [{ d: "2025-12-30" }, { d: "2026-01-02" }],
      "d"
    );
    expect(filled.map((r) => r.d)).toEqual([
      "2025-12-30",
      "2025-12-31",
      "2026-01-01",
      "2026-01-02",
    ]);
  });

  it("returns an already-complete series unchanged", () => {
    const rows = [{ d: "2026-09-11" }, { d: "2026-09-12" }];
    expect(fillMissingDays(rows, "d")).toBe(rows);
  });

  it("fills a two-year span to one row per day", () => {
    const filled = fillMissingDays(
      [{ d: "2024-09-25" }, { d: "2026-09-25" }],
      "d"
    );
    expect(filled).toHaveLength(731);
  });
});

describe("formatDayTick", () => {
  it("names the day over a short span and the month over a long one", () => {
    expect(formatDayTick("2026-09-11", 14)).toBe("11 Sep");
    expect(formatDayTick("2026-09-11", 730)).toBe("Sep 2026");
  });

  it("passes a non-date through", () => {
    expect(formatDayTick("n/a", 14)).toBe("n/a");
  });
});

describe("dailySpan", () => {
  it("counts days between first and last row", () => {
    expect(dailySpan([{ d: "2026-09-11" }, { d: "2026-09-25" }], "d")).toBe(14);
  });
});
