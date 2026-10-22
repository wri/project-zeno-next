import { describe, expect, it } from "vitest";

import { IntegratedAlertsLatestResponseSchema } from "../../api/schemas";
import {
  awaitingWeekData,
  countWithNewAlerts,
  formatAlertArea,
  formatFreshness,
  formatWeekRange,
  hasNewAlerts,
  toAlertsFreshness,
  toAlertsSummary,
  updatableChartsLabel,
} from "../alerts-summary";

const wire = {
  start_date: "2026-10-05",
  end_date: "2026-10-11",
  dashboards: {
    parana: { integrated_alerts: 1457.83, errors: {} },
    quiet: { integrated_alerts: 0, errors: {} },
    broken: {
      integrated_alerts: null,
      errors: { integrated_alerts: "Integrated alerts data is unavailable" },
    },
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
        a: { integrated_alerts: null, errors: { integrated_alerts: "down" } },
        b: { integrated_alerts: null, errors: { integrated_alerts: "down" } },
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

describe("toAlertsFreshness", () => {
  // Through the schema, since it owns the alert_date check.
  const latest = (alert_date: string, version: string) =>
    toAlertsFreshness(
      IntegratedAlertsLatestResponseSchema.parse({
        data: { alert_date, version },
      })
    );

  it("reads the detection date and the release date from its version", () => {
    // The analytics API's response on 2026-10-22.
    expect(latest("2026-10-16", "v20261018")).toEqual({
      latestAlertDate: "2026-10-16",
      updatedOn: "2026-10-18",
    });
  });

  it.each([["20261018"], ["v2026-10-18"], ["v20261018.1"], ["v20260230"]])(
    "throws on a version that is not a release date: %s",
    (version) => {
      expect(() => latest("2026-10-16", version)).toThrow(
        `Unexpected integrated alerts version: ${version}`
      );
    }
  );

  it.each([["20261016"], ["2026-10-16T00:00:00"], ["2026-02-30"]])(
    "rejects an alert date that is not a calendar date: %s",
    (alertDate) => {
      expect(() => latest(alertDate, "v20261018")).toThrow();
    }
  );
});

describe("awaitingWeekData", () => {
  it.each([
    ["2026-10-16", true],
    ["2026-10-17", true],
    ["2026-10-18", false],
    ["2026-10-20", false],
  ])(
    "week from 2026-10-18, detections up to %s: %s",
    (latestAlertDate, expected) => {
      expect(
        awaitingWeekData("2026-10-18", {
          latestAlertDate,
          updatedOn: "2026-10-21",
        })
      ).toBe(expected);
    }
  );
});

describe("formatFreshness", () => {
  it("prints both dates, the release without its year", () => {
    expect(
      formatFreshness({
        latestAlertDate: "2026-10-16",
        updatedOn: "2026-10-18",
      })
    ).toBe("Latest alert detected Oct 16, 2026 · updated Oct 18");
  });

  it("gives the release its year when it falls in the next one", () => {
    expect(
      formatFreshness({
        latestAlertDate: "2026-12-30",
        updatedOn: "2027-01-01",
      })
    ).toBe("Latest alert detected Dec 30, 2026 · updated Jan 1, 2027");
  });
});

describe("updatableChartsLabel", () => {
  it("words the lead-in by count, dropping the number when none is countable", () => {
    expect(updatableChartsLabel(0)).toBe("Charts can be updated.");
    expect(updatableChartsLabel(1)).toBe("1 chart can be updated.");
    expect(updatableChartsLabel(2)).toBe("2 charts can be updated.");
  });
});
