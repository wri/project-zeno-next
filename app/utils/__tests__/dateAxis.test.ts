import { describe, expect, it } from "vitest";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { fillMissingDays, isDailyAxis, pickDailyTicks } from "../dateAxis";

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

describe("pickDailyTicks", () => {
  const CHAR_PX = 6.5;
  const labels = (r: ReturnType<typeof pickDailyTicks>) =>
    r.ticks.map((t) => r.labels.get(t));

  it("labels every day of a week when there is room", () => {
    const r = pickDailyTicks("2026-09-11", "2026-09-17", 900, CHAR_PX);
    expect(r.ticks).toHaveLength(7);
    expect(labels(r)[0]).toBe("11 Sep");
  });

  it("thins a fortnight to every other day in a narrow card", () => {
    // Eight "11 Sep" labels need 8 × (39 + 16) = 440px.
    const r = pickDailyTicks("2026-09-11", "2026-09-25", 480, CHAR_PX);
    expect(r.ticks).toEqual([
      "2026-09-11",
      "2026-09-13",
      "2026-09-15",
      "2026-09-17",
      "2026-09-19",
      "2026-09-21",
      "2026-09-23",
      "2026-09-25",
    ]);
  });

  it("puts a year on month-starts, naming the year only where it changes", () => {
    const r = pickDailyTicks("2025-09-25", "2026-09-25", 1100, CHAR_PX);
    expect(r.ticks[0]).toBe("2025-10-01");
    expect(labels(r)).toEqual([
      "Oct 2025",
      "Nov",
      "Dec",
      "Jan 2026",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
    ]);
  });

  it("falls to weekly ticks when every other day does not fit", () => {
    // Every other day is 360 × 2/14 ≈ 51px apart; "11 Sep" pairs need 55.
    const r = pickDailyTicks("2026-09-11", "2026-09-25", 360, CHAR_PX);
    expect(r.ticks).toEqual(["2026-09-11", "2026-09-18", "2026-09-25"]);
  });

  it("steps a year to quarters in a narrow card, on calendar quarters", () => {
    // Two-monthly needs 6 × (52 + 16) = 408px; quarterly 4 × 68 = 272px.
    const r = pickDailyTicks("2025-09-25", "2026-09-25", 360, CHAR_PX);
    expect(r.ticks).toEqual([
      "2025-10-01",
      "2026-01-01",
      "2026-04-01",
      "2026-07-01",
    ]);
  });

  it("never lets neighbouring labels overlap, whatever the width", () => {
    for (const width of [200, 320, 400, 480, 640, 900, 1200]) {
      for (const [from, to] of [
        ["2026-09-19", "2026-09-25"],
        ["2026-09-12", "2026-09-25"],
        ["2025-12-01", "2026-01-29"],
        ["2026-06-28", "2026-09-25"],
        ["2025-09-26", "2026-09-25"],
        ["2024-09-27", "2026-09-25"],
      ]) {
        const r = pickDailyTicks(from, to, width, CHAR_PX);
        const span = differenceInCalendarDays(parseISO(to), parseISO(from));
        const x = r.ticks.map(
          (t) =>
            (differenceInCalendarDays(parseISO(t), parseISO(from)) / span) *
            width
        );
        const ls = labels(r) as string[];
        if (r.ticks.length === 1) continue;
        for (let i = 1; i < r.ticks.length; i++) {
          const needed = ((ls[i - 1].length + ls[i].length) / 2) * CHAR_PX;
          expect(x[i] - x[i - 1]).toBeGreaterThanOrEqual(needed);
        }
      }
    }
  });

  it("names the year on the first day tick when the span crosses a year", () => {
    const r = pickDailyTicks("2025-12-01", "2026-01-29", 400, CHAR_PX);
    expect(labels(r)[0]).toBe("1 Dec 2025");
    expect(labels(r).filter((l) => l?.includes("2026"))).toHaveLength(1);
  });

  it("gives two years half-yearly ticks in a single card", () => {
    // Quarterly would put "Oct 2024" and "Jan 2025" 50px apart; they need 68.
    const r = pickDailyTicks("2024-09-27", "2026-09-25", 400, CHAR_PX);
    expect(labels(r)).toEqual(["Jan 2025", "Jul", "Jan 2026", "Jul"]);
  });

  it("gives two years two-monthly ticks in a full-width card", () => {
    const r = pickDailyTicks("2024-09-27", "2026-09-25", 1000, CHAR_PX);
    expect(labels(r)).toEqual([
      "Nov 2024",
      "Jan 2025",
      "Mar",
      "May",
      "Jul",
      "Sep",
      "Nov",
      "Jan 2026",
      "Mar",
      "May",
      "Jul",
      "Sep",
    ]);
  });

  it("falls back to the coarsest step that has a tick when nothing fits", () => {
    const r = pickDailyTicks("2026-09-11", "2026-09-25", 40, CHAR_PX);
    expect(r.ticks.length).toBeGreaterThan(0);
  });
});
