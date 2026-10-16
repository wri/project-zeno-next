import { describe, expect, it } from "vitest";

import {
  alertsCsv,
  alertsCsvFilename,
  alertsMapLayer,
  alertsWidgetSpec,
  chipRange,
  landFilterOption,
  confidenceLabel,
  customStartMin,
  formatAlertDate,
  formatHa,
  formatLatest,
  initialWindow,
  needsWiderWindow,
  newWeekHa,
  rowsInRange,
  rowsSummary,
  rowArea,
  rowTiers,
  visibleRows,
  widenedWindow,
  type AlertDay,
  type AlertsList,
} from "../alertsWidgets";

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

const list: Pick<AlertsList, "anchor" | "newWeek"> = {
  anchor: "2026-10-16",
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
  it("builds the initial window as the backend does, `end - days` to today", () => {
    expect(initialWindow(30, "2026-10-16")).toEqual({
      start: "2026-09-16",
      end: "2026-10-16",
    });
    expect(initialWindow(1, "2026-10-16")).toEqual({
      start: "2026-10-15",
      end: "2026-10-16",
    });
  });
});

describe("land filters", () => {
  it("knows each Intersects option's label and explainer phrase", () => {
    expect(landFilterOption()).toEqual({ label: "Any" });
    expect(landFilterOption("natural_lands")).toMatchObject({
      label: "Natural lands",
      phrase: "on natural lands",
    });
    expect(landFilterOption("natural_forests")).toMatchObject({
      label: "Natural forests",
      phrase: "on natural forests",
    });
  });

  it("draws a land class beneath the alerts only when chosen and in the snapshot", () => {
    const withEntries = alertsWidgetSpec(
      config({
        dataset: {
          ...config().dataset,
          context_layers: [
            {
              name: "natural_lands",
              tile_url:
                "https://eoapi.example.org/natural-lands/{z}/{x}/{y}.png",
            },
            {
              name: "natural_forests",
              tile_url:
                "https://eoapi.example.org/natural-forests/{z}/{x}/{y}.png",
            },
          ],
        },
      })
    )!;
    expect(withEntries.layer.contextTileUrl).toBeUndefined();
    expect(withEntries.overlays.natural_lands?.contextLayerName).toBe(
      "natural_lands"
    );
    expect(withEntries.overlays.natural_forests?.contextLayerName).toBe(
      "natural_forests"
    );
    expect(withEntries.overlays.natural_lands?.contextTileUrl).toBeTruthy();
    expect(alertsMapLayer(withEntries)).toBe(withEntries.layer);
    expect(alertsMapLayer(withEntries, "natural_lands")).toBe(
      withEntries.overlays.natural_lands
    );
    expect(alertsMapLayer(withEntries, "natural_forests")).toBe(
      withEntries.overlays.natural_forests
    );

    // A snapshot from before the backend carried the entries: no overlay.
    const without = alertsWidgetSpec(config())!;
    expect(without.overlays).toEqual({});
    expect(alertsMapLayer(without, "natural_lands")).toBe(without.layer);

    // The lands entry alone: forests narrows the list, the map stays as is.
    const landsOnly = alertsWidgetSpec(
      config({
        dataset: {
          ...config().dataset,
          context_layers: [
            { name: "natural_lands", tile_url: "https://eoapi.example.org/nl" },
          ],
        },
      })
    )!;
    expect(alertsMapLayer(landsOnly, "natural_forests")).toBe(landsOnly.layer);
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

  it("counts back from the anchor, however far it lags the window or today", () => {
    const lagging = { ...list, anchor: "2026-10-12" };
    expect(chipRange("last-day", lagging)).toEqual({
      start: "2026-10-12",
      end: "2026-10-12",
    });
    expect(chipRange("last-week", lagging).start).toBe("2026-10-06");
    // A custom range reaching past the anchor stops at it.
    expect(
      chipRange("custom", lagging, { start: "2026-10-10", end: "2026-10-16" })
    ).toEqual({ start: "2026-10-10", end: "2026-10-12" });
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

describe("tiers", () => {
  const both = day({ highHa: 12.5, highestHa: 3, totalHa: 15.5 });
  const highOnly = day({ highHa: 2.1, highestHa: 0, totalHa: 2.1 });
  const highestOnly = day({ highHa: 0, highestHa: 1.6, totalHa: 1.6 });

  it("names the tiers a day had alerts in, or the one tier on show", () => {
    expect(rowTiers(both, "all")).toBe("High · Highest");
    expect(rowTiers(highOnly, "all")).toBe("High");
    expect(rowTiers(highestOnly, "all")).toBe("Highest");
    expect(rowTiers(both, "high")).toBe("High");
    expect(rowTiers(both, "highest")).toBe("Highest");
  });

  it("gives the day's area in the shown tier", () => {
    expect(rowArea(both, "all")).toBe(15.5);
    expect(rowArea(both, "high")).toBe(12.5);
    expect(rowArea(both, "highest")).toBe(3);
  });

  it("names the tiers in the shown rows for the badge row", () => {
    expect(confidenceLabel("all")).toBe("High · Highest");
    expect(confidenceLabel("high")).toBe("High");
    expect(confidenceLabel("highest")).toBe("Highest");
  });
});

describe("download", () => {
  it("writes the rows on show with the tiers as the table names them", () => {
    const rows = [
      day({ date: "2026-10-10", highHa: 12.5, highestHa: 3, totalHa: 15.5 }),
      day({
        date: "2026-10-09",
        highHa: 0,
        highestHa: 1.6,
        totalHa: 1.6,
        isNew: false,
      }),
    ];
    expect(alertsCsv(rows, "all")).toBe(
      [
        "alert_date,confidence,high_ha,highest_ha,total_ha,new",
        "2026-10-10,High · Highest,12.5,3,15.5,true",
        "2026-10-09,Highest,0,1.6,1.6,false",
      ].join("\n")
    );
    expect(alertsCsv(rows, "high").split("\n")[1]).toBe(
      "2026-10-10,High,12.5,3,15.5,true"
    );
    expect(alertsCsv([], "all")).toBe(
      "alert_date,confidence,high_ha,highest_ha,total_ha,new"
    );
  });

  it("names the file after the area and the period", () => {
    const range = { start: "2026-10-10", end: "2026-10-16" };
    expect(alertsCsvFilename("Guarapuava, Paraná, Brazil", range)).toBe(
      "integrated-alerts-guarapuava-parana-brazil-2026-10-10-2026-10-16.csv"
    );
    expect(alertsCsvFilename("  ", range)).toBe(
      "integrated-alerts-area-2026-10-10-2026-10-16.csv"
    );
  });
});

describe("formatting", () => {
  it("formats dates per the design's two forms", () => {
    expect(formatAlertDate("2026-09-26")).toBe("26 Sep 2026");
    expect(formatAlertDate("2026-10-05")).toBe("5 Oct 2026");
    expect(formatLatest("2026-09-28")).toBe("SEP 28, 2026");
    expect(formatLatest("2026-10-05")).toBe("OCT 5, 2026");
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
