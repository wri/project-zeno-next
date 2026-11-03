import { describe, expect, it } from "vitest";
import {
  computeYAxisWidth,
  dailyAxisRows,
  formatStackTotal,
  legendItemSorter,
  stackPeak,
} from "../ChartWidget";

describe("computeYAxisWidth", () => {
  it("reserves a title band when a y-axis title will render", () => {
    const withTitle = computeYAxisWidth(4, true);
    const withoutTitle = computeYAxisWidth(4, false);
    // 22px title band, per ChartWidget's TITLE_BAND constant.
    expect(withTitle - withoutTitle).toBe(22);
  });

  it("still fits the widest tick text with no title (e.g. LGMS's empty yAxis)", () => {
    // "1500"/"-1000" etc. — 4-5 chars at the 11px axis font.
    const width = computeYAxisWidth(5, false);
    expect(width).toBeGreaterThanOrEqual(5 * 6.5 + 6);
  });

  it("grows with the longest tick's character count", () => {
    expect(computeYAxisWidth(6, false)).toBeGreaterThan(
      computeYAxisWidth(3, false)
    );
  });
});

describe("dailyAxisRows", () => {
  const ALERT_DAYS = [
    { alert_date: "2026-09-01", "High confidence": 2 },
    { alert_date: "2026-09-03", "High confidence": 1 },
  ];

  it("gives a day-by-day stacked bar a slot for every day, a quiet day empty", () => {
    expect(dailyAxisRows("stacked-bar", ALERT_DAYS, "alert_date")).toEqual([
      ALERT_DAYS[0],
      { alert_date: "2026-09-02" },
      ALERT_DAYS[1],
    ]);
  });

  it("keeps day-by-day lines and areas on a daily axis", () => {
    expect(dailyAxisRows("line", ALERT_DAYS, "alert_date")).toHaveLength(3);
    expect(dailyAxisRows("area", ALERT_DAYS, "alert_date")).toHaveLength(3);
  });

  it("leaves other chart types and non-day axes alone", () => {
    expect(dailyAxisRows("bar", ALERT_DAYS, "alert_date")).toBeNull();
    expect(
      dailyAxisRows("stacked-bar", [{ year: 2021 }, { year: 2022 }], "year")
    ).toBeNull();
  });
});

describe("legendItemSorter", () => {
  const STACK = ["Highest confidence", "High confidence", "Low confidence"];

  it("lists a stack's series bottom up, as they stack", () => {
    const sorter = legendItemSorter("stacked-bar", STACK);
    expect(typeof sorter).toBe("function");
    // Recharts hands the payload over alphabetically.
    const items = [...STACK]
      .sort()
      .map((name) => ({ dataKey: name, value: name }));
    const sorted = items.sort((a, b) => {
      const key = sorter as (item: { dataKey: string }) => number;
      return key(a) - key(b);
    });
    expect(sorted.map((item) => item.dataKey)).toEqual(STACK);
  });

  it("keeps recharts' alphabetical legend for other charts", () => {
    expect(legendItemSorter("line", STACK)).toBe("value");
    expect(legendItemSorter("bar", STACK)).toBe("value");
  });
});

describe("stackPeak", () => {
  const TIERS = ["Highest confidence", "High confidence", "Low confidence"];

  it("finds the day with the tallest stack and its total", () => {
    const rows = [
      { alert_date: "2026-10-05", "High confidence": 70, "Low confidence": 7 },
      {
        alert_date: "2026-10-06",
        "Highest confidence": 31,
        "High confidence": 40,
        "Low confidence": 18,
      },
      { alert_date: "2026-10-07", "Highest confidence": 80 },
    ];
    expect(stackPeak(rows, "alert_date", TIERS)).toEqual({
      x: "2026-10-06",
      total: 89,
    });
  });

  it("skips quiet days and keeps the first of equal stacks", () => {
    const rows = [
      { alert_date: "2026-10-01" },
      { alert_date: "2026-10-02", "High confidence": 5 },
      { alert_date: "2026-10-03", "Low confidence": 5 },
    ];
    expect(stackPeak(rows, "alert_date", TIERS)).toEqual({
      x: "2026-10-02",
      total: 5,
    });
  });

  it("has no peak when no day has any area", () => {
    const rows = [{ alert_date: "2026-10-01" }, { alert_date: "2026-10-02" }];
    expect(stackPeak(rows, "alert_date", TIERS)).toBeNull();
  });
});

describe("formatStackTotal", () => {
  it("reads as whole units with the axis's unit", () => {
    expect(formatStackTotal(89.2, "area_ha")).toBe("89 ha");
    expect(formatStackTotal(14409.37, "area_ha")).toBe("14,409 ha");
  });

  it("keeps a decimal under 10 so a small total does not read as 0", () => {
    expect(formatStackTotal(0.4, "area_ha")).toBe("0.4 ha");
  });

  it("is the bare number when the axis has no unit", () => {
    expect(formatStackTotal(12, "count")).toBe("12");
  });
});
