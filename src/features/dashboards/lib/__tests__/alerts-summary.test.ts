import { describe, expect, it } from "vitest";

import { IntegratedAlertsLatestResponseSchema } from "../../api/schemas";
import {
  ALERTS_DATA_TOOLTIP,
  alertsStripAction,
  awaitingPeriodData,
  countWithNewAlerts,
  formatAlertArea,
  formatDataUpdated,
  formatFreshness,
  formatPeriodRange,
  hasNewAlerts,
  toAlertsFreshness,
  toAlertsSummary,
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
  it("settles the wire into the period, the assessed count and the areas with alerts", () => {
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

  it("flags only the dashboards whose period carried alerts", () => {
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

describe("formatPeriodRange", () => {
  it("collapses a period inside one month", () => {
    expect(formatPeriodRange("2026-10-05", "2026-10-11")).toBe("Oct 5–11");
  });

  it("names both months when the period crosses one", () => {
    expect(formatPeriodRange("2026-10-26", "2026-11-01")).toBe(
      "Oct 26 – Nov 1"
    );
  });

  it("names both years when the period crosses a year end", () => {
    expect(formatPeriodRange("2025-12-28", "2026-01-03")).toBe(
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

describe("awaitingPeriodData", () => {
  it.each([
    ["2026-10-16", true],
    ["2026-10-17", true],
    ["2026-10-18", false],
    ["2026-10-20", false],
  ])(
    "period from 2026-10-18, detections up to %s: %s",
    (latestAlertDate, expected) => {
      expect(
        awaitingPeriodData("2026-10-18", {
          latestAlertDate,
          updatedOn: "2026-10-21",
        })
      ).toBe(expected);
    }
  );
});

describe("formatFreshness", () => {
  const both = { latestAlertDate: "2026-11-13", updatedOn: "2026-11-15" };
  const acrossYears = {
    latestAlertDate: "2026-12-31",
    updatedOn: "2027-01-02",
  };

  it("puts the release first and the year once, at the end", () => {
    expect(formatFreshness(both)).toBe(
      "Data updated Nov 15 · alerts to Nov 13, 2026"
    );
    expect(formatFreshness(both, "day-first")).toBe(
      "Data updated 15 Nov · alerts to 13 Nov 2026"
    );
  });

  it("gives both dates their year when they fall in different ones", () => {
    expect(formatFreshness(acrossYears)).toBe(
      "Data updated Jan 2, 2027 · alerts to Dec 31, 2026"
    );
    expect(formatFreshness(acrossYears, "day-first")).toBe(
      "Data updated 2 Jan 2027 · alerts to 31 Dec 2026"
    );
  });

  it("prints the one date it has", () => {
    expect(formatFreshness({ latestAlertDate: "2026-11-13" })).toBe(
      "Alerts to Nov 13, 2026"
    );
    expect(formatFreshness({ updatedOn: "2026-11-15" }, "day-first")).toBe(
      "Data updated 15 Nov 2026"
    );
  });

  it("prints nothing without either date", () => {
    expect(formatFreshness({})).toBeUndefined();
  });
});

describe("ALERTS_DATA_TOOLTIP", () => {
  it("says how often new alerts data arrives", () => {
    expect(ALERTS_DATA_TOOLTIP).toBe(
      "Alerts are dated by when they were detected. Global Nature Watch gets new alerts data about once a week, so the newest alerts can be a week or more old."
    );
  });
});

describe("formatDataUpdated", () => {
  it("dates the release without a year, like the period before it", () => {
    expect(formatDataUpdated("2026-11-15", "2026-11-13")).toBe(
      "Data updated Nov 15"
    );
  });

  it("gives the release its year when it falls after the period's year", () => {
    expect(formatDataUpdated("2027-01-02", "2026-12-31")).toBe(
      "Data updated Jan 2, 2027"
    );
  });
});

describe("alertsStripAction", () => {
  const owner = {
    alertsWidgetId: undefined,
    canAdd: true,
    templateNames: ["nrt-monitoring", "post-2020-forest-loss"],
    pendingTemplates: [],
  };

  it("links to the alerts list when the dashboard has one, for anyone", () => {
    expect(alertsStripAction({ ...owner, alertsWidgetId: "w-alerts" })).toEqual(
      { kind: "view", widgetId: "w-alerts" }
    );
    expect(
      alertsStripAction({
        ...owner,
        alertsWidgetId: "w-alerts",
        canAdd: false,
        templateNames: undefined,
      })
    ).toEqual({ kind: "view", widgetId: "w-alerts" });
  });

  it("offers an owner the Near real-time monitoring template otherwise", () => {
    expect(alertsStripAction(owner)).toEqual({ kind: "add", state: "idle" });
  });

  it("offers nothing to a viewer, or while the registry is unknown or lacks the template", () => {
    expect(alertsStripAction({ ...owner, canAdd: false })).toEqual({
      kind: "none",
    });
    expect(alertsStripAction({ ...owner, templateNames: undefined })).toEqual({
      kind: "none",
    });
    expect(
      alertsStripAction({ ...owner, templateNames: ["post-2020-forest-loss"] })
    ).toEqual({ kind: "none" });
  });

  it("reads as adding while that template applies, and holds while another does", () => {
    expect(
      alertsStripAction({ ...owner, pendingTemplates: ["nrt-monitoring"] })
    ).toEqual({ kind: "add", state: "adding" });
    expect(
      alertsStripAction({
        ...owner,
        pendingTemplates: ["post-2020-forest-loss"],
      })
    ).toEqual({ kind: "add", state: "disabled" });
  });

  it("switches to the link as soon as the template's alerts list arrives, still pending", () => {
    expect(
      alertsStripAction({
        ...owner,
        alertsWidgetId: "w-new",
        pendingTemplates: ["nrt-monitoring"],
      })
    ).toEqual({ kind: "view", widgetId: "w-new" });
  });
});
