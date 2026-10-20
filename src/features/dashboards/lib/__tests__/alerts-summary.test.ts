import { describe, expect, it } from "vitest";

import {
  countWithNewAlerts,
  formatAlertArea,
  formatCheckedAt,
  formatWeekRange,
  hasNewAlerts,
  toAlertsSummary,
  updatableChartsLabel,
} from "../alerts-summary";

const wire = {
  start_date: "2026-10-05",
  end_date: "2026-10-11",
  dashboards: {
    parana: { integrated_alerts: 1457.83 },
    quiet: { integrated_alerts: 0 },
    broken: { integrated_alerts: null },
  },
};

describe("toAlertsSummary", () => {
  it("settles the wire into the week, the assessed count and the areas with alerts", () => {
    expect(toAlertsSummary(wire)).toEqual({
      startDate: "2026-10-05",
      endDate: "2026-10-11",
      assessedCount: 2,
      newAlertAreaHa: { parana: 1457.83 },
    });
  });

  it("reports nothing assessed for an empty response", () => {
    const summary = toAlertsSummary({ ...wire, dashboards: {} });
    expect(summary.assessedCount).toBe(0);
    expect(summary.newAlertAreaHa).toEqual({});
  });

  it("reports nothing assessed when every total failed", () => {
    const summary = toAlertsSummary({
      ...wire,
      dashboards: {
        a: { integrated_alerts: null },
        b: { integrated_alerts: null },
      },
    });
    expect(summary.assessedCount).toBe(0);
    expect(summary.newAlertAreaHa).toEqual({});
  });
});

describe("new alerts", () => {
  const summary = toAlertsSummary(wire);

  it("flags only the dashboards whose week carried alerts", () => {
    expect(hasNewAlerts(summary, "parana")).toBe(true);
    expect(hasNewAlerts(summary, "quiet")).toBe(false);
    expect(hasNewAlerts(summary, "broken")).toBe(false);
    expect(hasNewAlerts(summary, "not-assessed")).toBe(false);
  });

  it("counts across the ids on the page, unassessed ones included", () => {
    expect(
      countWithNewAlerts(summary, ["parana", "quiet", "broken", "other"])
    ).toBe(1);
  });
});

describe("formatWeekRange", () => {
  it("collapses a week inside one month", () => {
    expect(formatWeekRange("2026-10-05", "2026-10-11")).toBe("Oct 5–11");
  });

  it("names both months when the week crosses one", () => {
    expect(formatWeekRange("2026-10-26", "2026-11-01")).toBe("Oct 26 – Nov 1");
  });

  it("names both years when the week crosses a year end", () => {
    expect(formatWeekRange("2025-12-28", "2026-01-03")).toBe(
      "Dec 28, 2025 – Jan 3, 2026"
    );
  });
});

describe("formatAlertArea", () => {
  it("rounds to whole hectares with thousands separators from 10 ha", () => {
    expect(formatAlertArea(1457.83)).toBe("1,458 ha");
    expect(formatAlertArea(21973.87)).toBe("21,974 ha");
    expect(formatAlertArea(12)).toBe("12 ha");
  });

  it("keeps a decimal for small weeks, and never prints 0 ha", () => {
    expect(formatAlertArea(3.13)).toBe("3.1 ha");
    expect(formatAlertArea(0.52)).toBe("0.5 ha");
    expect(formatAlertArea(0.01)).toBe("<0.1 ha");
  });
});

describe("formatCheckedAt", () => {
  it("prints the UTC date and 24-hour time the design shows", () => {
    expect(formatCheckedAt(Date.UTC(2026, 9, 9, 14, 0))).toBe(
      "Oct 9, 2026 · 14:00 UTC"
    );
    expect(formatCheckedAt(Date.UTC(2026, 0, 1, 0, 5))).toBe(
      "Jan 1, 2026 · 00:05 UTC"
    );
  });
});

describe("updatableChartsLabel", () => {
  it("words the lead-in by count, dropping the number when none is countable", () => {
    expect(updatableChartsLabel(0)).toBe("Charts can be updated.");
    expect(updatableChartsLabel(1)).toBe("1 chart can be updated.");
    expect(updatableChartsLabel(2)).toBe("2 charts can be updated.");
  });
});
