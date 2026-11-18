import { describe, expect, it } from "vitest";

import type { InsightWidget } from "@/app/types/chat";
import {
  ALERTS_CHART_PRESETS,
  alertsChartPeriod,
  alertsChartRange,
  hasAlertsChartPills,
  periodRangeProblem,
  rowsInPeriod,
} from "../alertsChart";

/** The 30 days to the latest alert date, one row each, as the backend stores them. */
function days(start: string, count: number): Record<string, unknown>[] {
  const first = Date.UTC(
    Number(start.slice(0, 4)),
    Number(start.slice(5, 7)) - 1,
    Number(start.slice(8, 10))
  );
  return Array.from({ length: count }, (_, i) => ({
    alert_date: new Date(first + i * 86_400_000).toISOString().slice(0, 10),
  }));
}

function chart(change: Partial<InsightWidget> = {}): InsightWidget {
  return {
    id: "insight-1-chart-0",
    type: "stacked-bar",
    title: "Integrated alerts",
    description: "",
    data: days("2026-09-17", 30),
    xAxis: "alert_date",
    yAxis: "area_ha",
    seriesFields: ["Low confidence", "High confidence", "Highest confidence"],
    ...change,
  };
}

const PERIOD = { start: "2026-09-17", end: "2026-10-16" };

describe("hasAlertsChartPills", () => {
  it("is the daily alerts stacked bar of a Near real-time monitoring section", () => {
    expect(hasAlertsChartPills(chart(), "nrt-monitoring")).toBe(true);
  });

  it("leaves the chart alone outside that section", () => {
    expect(hasAlertsChartPills(chart(), undefined)).toBe(false);
    expect(hasAlertsChartPills(chart(), "post-2020-forest-loss")).toBe(false);
  });

  it("leaves other charts of the section alone, and alerts drawn as lines before", () => {
    expect(hasAlertsChartPills(chart({ type: "line" }), "nrt-monitoring")).toBe(
      false
    );
    expect(
      hasAlertsChartPills(
        chart({ xAxis: "tree_cover_loss_year" }),
        "nrt-monitoring"
      )
    ).toBe(false);
    expect(hasAlertsChartPills(chart({ data: [] }), "nrt-monitoring")).toBe(
      false
    );
  });
});

describe("alertsChartPeriod", () => {
  it("is the chart's first and last day: the backend gives every day a row", () => {
    expect(alertsChartPeriod(chart())).toEqual(PERIOD);
  });

  it("is null for rows that are not days", () => {
    expect(alertsChartPeriod(chart({ data: [{ alert_date: 2026 }] }))).toBe(
      null
    );
    expect(alertsChartPeriod(chart({ data: "nope" }))).toBe(null);
  });
});

describe("alertsChartRange", () => {
  it("counts each preset back from the latest alert date, both ends counted", () => {
    const ranges = ALERTS_CHART_PRESETS.map(({ value }) =>
      alertsChartRange(value, PERIOD)
    );
    expect(ranges).toEqual([
      PERIOD,
      { start: "2026-10-03", end: "2026-10-16" },
      { start: "2026-10-10", end: "2026-10-16" },
    ]);
  });

  it("never reaches before the chart's first day", () => {
    const short = { start: "2026-10-12", end: "2026-10-16" };
    expect(alertsChartRange("last-2-weeks", short)).toEqual(short);
  });

  it("takes a custom range as given, clamped into the period and ordered", () => {
    expect(
      alertsChartRange("custom", PERIOD, {
        start: "2026-09-20",
        end: "2026-09-25",
      })
    ).toEqual({ start: "2026-09-20", end: "2026-09-25" });
    expect(
      alertsChartRange("custom", PERIOD, {
        start: "2026-09-01",
        end: "2026-11-01",
      })
    ).toEqual(PERIOD);
    expect(alertsChartRange("custom", PERIOD)).toEqual(PERIOD);
  });
});

describe("periodRangeProblem", () => {
  it("takes a range inside the period, in order", () => {
    expect(periodRangeProblem(PERIOD, PERIOD)).toBeUndefined();
    expect(
      periodRangeProblem({ start: "2026-10-01", end: "2026-10-01" }, PERIOD)
    ).toBeUndefined();
  });

  it("names a bound outside the period, as a date input reports mid-typing", () => {
    expect(
      periodRangeProblem({ start: "2026-09-16", end: "2026-10-16" }, PERIOD)
    ).toBe("outside");
    expect(
      periodRangeProblem({ start: "0002-10-10", end: "2026-10-16" }, PERIOD)
    ).toBe("outside");
  });

  it("names a range whose end is before its start", () => {
    expect(
      periodRangeProblem({ start: "2026-10-10", end: "2026-10-01" }, PERIOD)
    ).toBe("inverted");
  });
});

describe("rowsInPeriod", () => {
  it("keeps the days of the range, the quiet ones too, without refetching", () => {
    const rows = rowsInPeriod(chart().data, "alert_date", {
      start: "2026-10-10",
      end: "2026-10-16",
    });
    expect(rows.map((row) => row.alert_date)).toEqual([
      "2026-10-10",
      "2026-10-11",
      "2026-10-12",
      "2026-10-13",
      "2026-10-14",
      "2026-10-15",
      "2026-10-16",
    ]);
  });
});
