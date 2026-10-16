import { describe, expect, it } from "vitest";

import {
  alertsWidgetSpec,
  chipRange,
  customStartMin,
  formatAlertDate,
  formatDataTo,
  formatHa,
  initialWindow,
  needsWiderWindow,
  newWeekHa,
  rowsInRange,
  rowsSummary,
  shiftIsoDate,
  todayIso,
  visibleRows,
  widenedWindow,
  withTileDates,
  type AlertDay,
  type AlertsList,
} from "../alertsWidgets";
import type { MapWidgetLayer } from "../mapWidgets";

const ALERTS_TILE_URL =
  "https://tiles.globalforestwatch.org/gfw_integrated_dist_alerts/latest/dynamic/{z}/{x}/{y}.png?render_type=true_color&start_date=2026-09-17&end_date=2026-10-16";

const config = (overrides: Record<string, unknown> = {}) => ({
  alerts: {
    aoi: {
      source: "gadm",
      src_id: "BRA.16.137_2",
      subtype: "district",
      name: "Guarapuava",
    },
    days: 30,
  },
  dataset: {
    dataset_id: 11,
    dataset_name: "Integrated alerts",
    tile_url: ALERTS_TILE_URL,
    context_layer: null,
    context_layers: [],
    start_date: "2026-09-17",
    end_date: "2026-10-16",
  },
  ...overrides,
});

const day = (overrides: Partial<AlertDay> = {}): AlertDay => ({
  date: "2026-10-09",
  highHa: 12.5,
  highestHa: 3,
  totalHa: 15.5,
  isNew: true,
  ...overrides,
});

const list: Pick<AlertsList, "dataTo" | "newWeek"> = {
  dataTo: "2026-10-16",
  newWeek: { start: "2026-10-04", end: "2026-10-10" },
};

describe("alertsWidgetSpec", () => {
  it("parses a config into a spec with the alerts layer", () => {
    const spec = alertsWidgetSpec(config());
    expect(spec).toMatchObject({
      title: "Integrated alerts in Guarapuava",
      aoi: {
        source: "gadm",
        srcId: "BRA.16.137_2",
        subtype: "district",
        name: "Guarapuava",
      },
      days: 30,
      layer: {
        kind: "dataset",
        tileUrl: ALERTS_TILE_URL,
        datasetId: 11,
        startDate: "2026-09-17",
        endDate: "2026-10-16",
      },
    });
  });

  it("prefers the config.title override for the card header", () => {
    expect(
      alertsWidgetSpec({ ...config(), title: "Alerts over the park" })?.title
    ).toBe("Alerts over the park");
  });

  it("takes the dashboard's area name when the config has none", () => {
    const c = config();
    const aoi = (c.alerts as { aoi: Record<string, unknown> }).aoi;
    delete aoi.name;
    const spec = alertsWidgetSpec(c, "Paraná");
    expect(spec?.aoi.name).toBe("Paraná");
    expect(spec?.title).toBe("Integrated alerts in Paraná");
  });

  it("defaults days to 30 when absent or not a positive integer", () => {
    for (const days of [undefined, 0, -3, 2.5, "30", null]) {
      const c = config();
      (c.alerts as Record<string, unknown>).days = days;
      expect(alertsWidgetSpec(c)?.days).toBe(30);
    }
  });

  it("returns null when the area identity is incomplete", () => {
    for (const key of ["source", "src_id", "subtype"]) {
      const c = config();
      const aoi = (c.alerts as { aoi: Record<string, unknown> }).aoi;
      delete aoi[key];
      expect(alertsWidgetSpec(c)).toBeNull();
    }
    expect(alertsWidgetSpec({ ...config(), alerts: {} })).toBeNull();
    expect(alertsWidgetSpec({})).toBeNull();
  });

  it("returns null when there is no alerts layer to put on the map", () => {
    expect(alertsWidgetSpec(config({ dataset: undefined }))).toBeNull();
    const c = config();
    (c.dataset as Record<string, unknown>).tile_url = "";
    expect(alertsWidgetSpec(c)).toBeNull();
  });

  it("keeps the widget title override out of the map layer's title", () => {
    const spec = alertsWidgetSpec({ ...config(), title: "Renamed" });
    expect(spec?.layer.title).toBe("Integrated alerts");
  });
});

describe("date arithmetic", () => {
  it("shifts across month, year and leap-day boundaries without a timezone", () => {
    expect(shiftIsoDate("2026-10-16", -2)).toBe("2026-10-14");
    expect(shiftIsoDate("2026-10-01", -1)).toBe("2026-09-30");
    expect(shiftIsoDate("2027-01-01", -1)).toBe("2026-12-31");
    expect(shiftIsoDate("2028-03-01", -1)).toBe("2028-02-29");
    expect(shiftIsoDate("2026-10-16", 0)).toBe("2026-10-16");
    expect(shiftIsoDate("2026-10-16", 29)).toBe("2026-11-14");
  });

  it("reads today in UTC", () => {
    expect(todayIso(Date.UTC(2026, 9, 16, 23, 30))).toBe("2026-10-16");
    expect(todayIso(Date.UTC(2026, 9, 16, 0, 5))).toBe("2026-10-16");
  });

  it("builds the initial window as `days` days ending today", () => {
    expect(initialWindow(30, "2026-10-16")).toEqual({
      start: "2026-09-17",
      end: "2026-10-16",
    });
    expect(initialWindow(1, "2026-10-16")).toEqual({
      start: "2026-10-16",
      end: "2026-10-16",
    });
  });
});

describe("chipRange", () => {
  it("counts every chip back from the data's last day", () => {
    expect(chipRange("new-week", list)).toEqual({
      start: "2026-10-04",
      end: "2026-10-10",
    });
    expect(chipRange("last-day", list)).toEqual({
      start: "2026-10-16",
      end: "2026-10-16",
    });
    expect(chipRange("last-3-days", list)).toEqual({
      start: "2026-10-14",
      end: "2026-10-16",
    });
    expect(chipRange("last-week", list)).toEqual({
      start: "2026-10-10",
      end: "2026-10-16",
    });
  });

  it("never counts from a later data_to than the response gives", () => {
    const stale = { ...list, dataTo: "2026-10-12" };
    expect(chipRange("last-day", stale)).toEqual({
      start: "2026-10-12",
      end: "2026-10-12",
    });
    expect(chipRange("last-week", stale).start).toBe("2026-10-06");
  });

  it("clamps a custom range into the data and orders it", () => {
    expect(
      chipRange("custom", list, { start: "2026-09-01", end: "2026-09-30" })
    ).toEqual({ start: "2026-09-01", end: "2026-09-30" });
    // Reaching past the data: the end is the data's last day.
    expect(
      chipRange("custom", list, { start: "2026-10-10", end: "2026-12-31" })
    ).toEqual({ start: "2026-10-10", end: "2026-10-16" });
    // Start after end: a one-day range at the end.
    expect(
      chipRange("custom", list, { start: "2026-10-20", end: "2026-10-18" })
    ).toEqual({ start: "2026-10-16", end: "2026-10-16" });
    // No custom range yet: the last day.
    expect(chipRange("custom", list)).toEqual({
      start: "2026-10-16",
      end: "2026-10-16",
    });
  });
});

describe("customStartMin", () => {
  it("is a year back from the data's last day, inclusive of both ends", () => {
    expect(customStartMin("2026-10-16")).toBe("2025-10-17");
    expect(customStartMin("2024-12-01")).toBe("2023-12-03");
  });

  it("never reaches before the dataset's first day", () => {
    expect(customStartMin("2024-06-01")).toBe("2023-12-01");
    expect(customStartMin("2023-12-01")).toBe("2023-12-01");
  });
});

describe("window widening", () => {
  const window = { start: "2026-09-17", end: "2026-10-16" };

  it("knows when a range reaches outside the fetched window", () => {
    expect(
      needsWiderWindow({ start: "2026-10-01", end: "2026-10-16" }, window)
    ).toBe(false);
    expect(
      needsWiderWindow({ start: "2026-09-17", end: "2026-10-16" }, window)
    ).toBe(false);
    expect(
      needsWiderWindow({ start: "2026-09-01", end: "2026-10-16" }, window)
    ).toBe(true);
    expect(
      needsWiderWindow({ start: "2026-10-01", end: "2026-10-20" }, window)
    ).toBe(true);
  });

  it("widens to the smallest window covering both", () => {
    expect(
      widenedWindow({ start: "2026-09-01", end: "2026-09-10" }, window)
    ).toEqual({ start: "2026-09-01", end: "2026-10-16" });
    expect(
      widenedWindow({ start: "2026-10-01", end: "2026-10-20" }, window)
    ).toEqual({ start: "2026-09-17", end: "2026-10-20" });
  });
});

describe("rows", () => {
  const rows: AlertDay[] = [
    day({
      date: "2026-10-16",
      highHa: 1,
      highestHa: 0,
      totalHa: 1,
      isNew: false,
    }),
    day({
      date: "2026-10-14",
      highHa: 0,
      highestHa: 2.5,
      totalHa: 2.5,
      isNew: false,
    }),
    day({ date: "2026-10-09", highHa: 12.5, highestHa: 3, totalHa: 15.5 }),
    day({ date: "2026-10-05", highHa: 4, highestHa: 0, totalHa: 4 }),
    day({
      date: "2026-09-20",
      highHa: 7,
      highestHa: 1,
      totalHa: 8,
      isNew: false,
    }),
  ];

  it("filters rows to an inclusive range", () => {
    expect(
      rowsInRange(rows, { start: "2026-10-05", end: "2026-10-14" }).map(
        (r) => r.date
      )
    ).toEqual(["2026-10-14", "2026-10-09", "2026-10-05"]);
    expect(
      rowsInRange(rows, { start: "2026-11-01", end: "2026-11-30" })
    ).toEqual([]);
  });

  it("keeps every day under All and drops empty days under a single tier", () => {
    expect(visibleRows(rows, "all")).toHaveLength(5);
    expect(visibleRows(rows, "high").map((r) => r.date)).toEqual([
      "2026-10-16",
      "2026-10-09",
      "2026-10-05",
      "2026-09-20",
    ]);
    expect(visibleRows(rows, "highest").map((r) => r.date)).toEqual([
      "2026-10-14",
      "2026-10-09",
      "2026-09-20",
    ]);
  });

  it("sums the shown tier for the footer", () => {
    expect(rowsSummary(rows, "all")).toEqual({ days: 5, ha: 31 });
    expect(rowsSummary(visibleRows(rows, "high"), "high")).toEqual({
      days: 4,
      ha: 24.5,
    });
    expect(rowsSummary(visibleRows(rows, "highest"), "highest")).toEqual({
      days: 3,
      ha: 6.5,
    });
    expect(rowsSummary([], "all")).toEqual({ days: 0, ha: 0 });
  });

  it("sums the new rows for the New this week chip, in the shown tier", () => {
    expect(newWeekHa(rows, "all")).toBe(19.5);
    expect(newWeekHa(rows, "high")).toBe(16.5);
    expect(newWeekHa(rows, "highest")).toBe(3);
    expect(newWeekHa([], "all")).toBe(0);
  });
});

describe("withTileDates", () => {
  const layer: MapWidgetLayer = {
    kind: "dataset",
    title: "Integrated alerts",
    tileUrl: ALERTS_TILE_URL,
    datasetId: 11,
    startDate: "2026-09-17",
    endDate: "2026-10-16",
  };
  const range = { start: "2026-10-04", end: "2026-10-10" };

  it("rewrites the snapshot's date parameters and the legend dates", () => {
    const dated = withTileDates(layer, range);
    expect(dated.tileUrl).toBe(
      "https://tiles.globalforestwatch.org/gfw_integrated_dist_alerts/latest/dynamic/{z}/{x}/{y}.png?render_type=true_color&start_date=2026-10-04&end_date=2026-10-10"
    );
    expect(dated.startDate).toBe("2026-10-04");
    expect(dated.endDate).toBe("2026-10-10");
    // The input is not mutated.
    expect(layer.tileUrl).toBe(ALERTS_TILE_URL);
  });

  it("is idempotent", () => {
    const once = withTileDates(layer, range);
    expect(withTileDates(once, range)).toEqual(once);
  });

  it("appends the parameters when the snapshot's URL lacks them", () => {
    const bare = {
      ...layer,
      tileUrl:
        "https://tiles.example.org/alerts/{z}/{x}/{y}.png?render_type=true_color",
    };
    expect(withTileDates(bare, range).tileUrl).toBe(
      "https://tiles.example.org/alerts/{z}/{x}/{y}.png?render_type=true_color&start_date=2026-10-04&end_date=2026-10-10"
    );
    const noQuery = {
      ...layer,
      tileUrl: "https://tiles.example.org/alerts/{z}/{x}/{y}.png",
    };
    expect(withTileDates(noQuery, range).tileUrl).toBe(
      "https://tiles.example.org/alerts/{z}/{x}/{y}.png?start_date=2026-10-04&end_date=2026-10-10"
    );
  });

  it("leaves the context sub-layer and the primary-forest protocol alone", () => {
    const withContext = {
      ...layer,
      tileUrl: `pf://${ALERTS_TILE_URL}`,
      contextTileUrl: "https://tiles.example.org/natural-lands/{z}/{x}/{y}.png",
      contextLayerName: "natural_lands",
    };
    const dated = withTileDates(withContext, range);
    expect(dated.tileUrl.startsWith("pf://https://")).toBe(true);
    expect(dated.tileUrl).toContain("start_date=2026-10-04");
    expect(dated.contextTileUrl).toBe(withContext.contextTileUrl);
    expect(dated.contextLayerName).toBe("natural_lands");
  });
});

describe("formatting", () => {
  it("formats dates per the design's two forms", () => {
    expect(formatAlertDate("2026-09-26")).toBe("26 Sep 2026");
    expect(formatAlertDate("2026-10-05")).toBe("5 Oct 2026");
    expect(formatDataTo("2026-09-28")).toBe("SEP 28, 2026");
    expect(formatDataTo("2026-10-05")).toBe("OCT 5, 2026");
  });

  it("formats hectares to one decimal with a sliver floor", () => {
    expect(formatHa(0)).toBe("0");
    expect(formatHa(0.04)).toBe("<0.1");
    expect(formatHa(0.1)).toBe("0.1");
    expect(formatHa(15.5)).toBe("15.5");
    expect(formatHa(15.55)).toBe("15.6");
    expect(formatHa(1312)).toBe("1,312");
    expect(formatHa(1312.26)).toBe("1,312.3");
  });
});
