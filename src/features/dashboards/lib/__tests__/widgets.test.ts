import { describe, it, expect } from "vitest";

import {
  chartSize,
  chartTitleOverride,
  computeReorder,
  dashboardWidgetToInsightWidgets,
  hasWidgetCustomization,
  insightModule,
  isChartShown,
  isSummaryShown,
  mapWidgetSize,
  moduleTitle,
  shownChartIds,
  widgetSize,
  widgetText,
  withChartHidden,
  withChartShown,
  withChartSize,
  withChartTitle,
  withSize,
  withSummaryShown,
  withText,
  withWidgetTitle,
} from "../widgets";
import type { DashboardWidget } from "../../api/schemas";

function chart(overrides: Record<string, unknown> = {}) {
  return {
    id: "c-1",
    position: 0,
    title: "Annual tree cover loss",
    chart_type: "bar",
    x_axis: "year",
    y_axis: "loss_ha",
    series_fields: null,
    chart_data: [{ year: 2020, loss_ha: 5 }],
    ...overrides,
  };
}

function widget(overrides: Partial<DashboardWidget> = {}): DashboardWidget {
  return {
    id: "w-1",
    position: 0,
    widget_type: "insight",
    insight_id: "ins-1",
    config: {},
    created_at: "2026-07-03T14:10:00",
    insight: {
      id: "ins-1",
      insight_text: "Loss rose 12%.",
      codeact_parts: null,
      charts: [chart()],
    },
    ...overrides,
  };
}

describe("widgetSize / withSize", () => {
  it("defaults to single and honours double", () => {
    expect(widgetSize({})).toBe("single");
    expect(widgetSize({ size: "double" })).toBe("double");
    expect(widgetSize({ size: "garbage" })).toBe("single");
  });

  it("withSize preserves the other config keys (config is replaced whole)", () => {
    expect(withSize({ default_view: "chart", title: "T" }, "double")).toEqual({
      default_view: "chart",
      title: "T",
      size: "double",
    });
  });
});

describe("mapWidgetSize", () => {
  it("defaults to double and honours an explicit single", () => {
    expect(mapWidgetSize({})).toBe("double");
    expect(mapWidgetSize({ size: "double" })).toBe("double");
    expect(mapWidgetSize({ size: "garbage" })).toBe("double");
    expect(mapWidgetSize({ size: "single" })).toBe("single");
  });
});

describe("chartSize / withChartSize", () => {
  it("reads the per-chart size and falls back to the widget size", () => {
    expect(chartSize({}, "c-1")).toBe("single");
    expect(chartSize({ size: "double" }, "c-1")).toBe("double");
    expect(chartSize({ sizes: { "c-1": "double" } }, "c-1")).toBe("double");
    expect(chartSize({ sizes: { "c-1": "double" } }, "c-2")).toBe("single");
    expect(chartSize({ sizes: { "c-1": "garbage" } }, "c-1")).toBe("single");
  });

  it("withChartSize preserves other config keys and sibling chart sizes", () => {
    expect(
      withChartSize({ title: "T", sizes: { "c-1": "double" } }, "c-2", "double")
    ).toEqual({
      title: "T",
      sizes: { "c-1": "double", "c-2": "double" },
    });
  });
});

describe("chartTitleOverride / withChartTitle", () => {
  it("reads a per-chart override and ignores blanks/missing", () => {
    expect(chartTitleOverride({}, "c-1")).toBeUndefined();
    expect(chartTitleOverride({ titles: { "c-1": "Renamed" } }, "c-1")).toBe(
      "Renamed"
    );
    expect(
      chartTitleOverride({ titles: { "c-1": "Renamed" } }, "c-2")
    ).toBeUndefined();
    expect(
      chartTitleOverride({ titles: { "c-1": "   " } }, "c-1")
    ).toBeUndefined();
  });

  it("sets the override, preserving other config keys and sibling titles", () => {
    expect(
      withChartTitle({ size: "double", titles: { "c-1": "A" } }, "c-2", "B")
    ).toEqual({ size: "double", titles: { "c-1": "A", "c-2": "B" } });
  });

  it("clears the override on a blank name and drops the empty titles key", () => {
    expect(
      withChartTitle({ size: "double", titles: { "c-1": "A" } }, "c-1", "  ")
    ).toEqual({ size: "double" });
  });
});

describe("withWidgetTitle", () => {
  it("sets config.title and preserves other keys", () => {
    expect(
      withWidgetTitle({ dataset: { tile_url: "x" } }, "Forest loss")
    ).toEqual({ dataset: { tile_url: "x" }, title: "Forest loss" });
  });

  it("clears config.title on a blank name", () => {
    expect(withWidgetTitle({ title: "Old", size: "double" }, "")).toEqual({
      size: "double",
    });
  });
});

describe("dashboardWidgetToInsightWidgets", () => {
  it("returns [] for a hidden insight or no charts", () => {
    expect(dashboardWidgetToInsightWidgets(widget({ insight: null }))).toEqual(
      []
    );
    expect(
      dashboardWidgetToInsightWidgets(
        widget({
          insight: { id: "i", insight_text: null, charts: [] },
        })
      )
    ).toEqual([]);
  });

  it("maps API chart fields to the InsightWidget shape", () => {
    const [card] = dashboardWidgetToInsightWidgets(widget());
    expect(card).toMatchObject({
      id: "c-1",
      type: "bar",
      title: "Annual tree cover loss",
      description: "Loss rose 12%.",
      data: [{ year: 2020, loss_ha: 5 }],
      xAxis: "year",
      yAxis: "loss_ha",
    });
    expect(card.seriesFields).toBeUndefined();
  });

  it("sorts charts by position and applies narrative/title only to the first", () => {
    const cards = dashboardWidgetToInsightWidgets(
      widget({
        config: { title: "Renamed" },
        insight: {
          id: "ins-1",
          insight_text: "Narrative.",
          codeact_parts: null,
          charts: [
            chart({ id: "c-2", position: 1, title: "Second" }),
            chart({ id: "c-1", position: 0, title: "First" }),
          ],
        },
      })
    );
    expect(cards.map((c) => c.id)).toEqual(["c-1", "c-2"]);
    expect(cards[0].title).toBe("Renamed");
    expect(cards[0].description).toBe("Narrative.");
    expect(cards[1].title).toBe("Second");
    expect(cards[1].description).toBe("");
  });

  it("prefers a per-chart title override over config.title and the chart title", () => {
    const cards = dashboardWidgetToInsightWidgets(
      widget({
        config: {
          title: "First-chart override",
          titles: { "c-2": "Renamed B" },
        },
        insight: {
          id: "ins-1",
          insight_text: "Narrative.",
          codeact_parts: null,
          charts: [
            chart({ id: "c-1", position: 0, title: "First" }),
            chart({ id: "c-2", position: 1, title: "Second" }),
          ],
        },
      })
    );
    // c-1: no per-chart override, so the legacy first-chart config.title wins.
    expect(cards[0].title).toBe("First-chart override");
    // c-2: its per-chart override wins over the chart's own title.
    expect(cards[1].title).toBe("Renamed B");
  });

  it("falls back to table for unknown chart types", () => {
    const cards = dashboardWidgetToInsightWidgets(
      widget({
        insight: {
          id: "ins-1",
          insight_text: null,
          codeact_parts: null,
          charts: [chart({ chart_type: "hexbin-3d" })],
        },
      })
    );
    expect(cards[0].type).toBe("table");
  });

  it("threads codeact provenance into generation", () => {
    const cards = dashboardWidgetToInsightWidgets(
      widget({
        insight: {
          id: "ins-1",
          insight_text: null,
          codeact_parts: [{ type: "code_block", content: "cHJpbnQoKQ==" }],
          charts: [chart()],
        },
      })
    );
    expect(cards[0].generation?.codeact_parts).toHaveLength(1);
  });

  it("attaches the dashboard area as analysis params on every card", () => {
    const cards = dashboardWidgetToInsightWidgets(
      widget({
        insight: {
          id: "ins-1",
          insight_text: null,
          codeact_parts: null,
          charts: [chart({ id: "c-1" }), chart({ id: "c-2", position: 1 })],
        },
      }),
      { areaName: "Paraná, Brazil" }
    );
    expect(cards[0].analysisParams).toEqual({ areas: ["Paraná, Brazil"] });
    expect(cards[1].analysisParams).toEqual({ areas: ["Paraná, Brazil"] });
  });

  it("omits analysis params when no area name is given", () => {
    const [card] = dashboardWidgetToInsightWidgets(widget());
    expect(card.analysisParams).toBeUndefined();
  });
});

describe("widgetText", () => {
  it("returns the markdown body from config.text", () => {
    expect(widgetText({ text: "**Key Insights**\n\n- one" })).toBe(
      "**Key Insights**\n\n- one"
    );
  });

  it("returns null for missing, non-string or blank text", () => {
    expect(widgetText({})).toBeNull();
    expect(widgetText({ text: 42 })).toBeNull();
    expect(widgetText({ text: "   " })).toBeNull();
  });
});

describe("withText", () => {
  it("stores the markdown body under config.text, preserving other keys", () => {
    expect(withText({ size: "double" }, "## Note\n\n- one")).toEqual({
      size: "double",
      text: "## Note\n\n- one",
    });
  });

  it("drops config.text when the body is blank so the placeholder shows", () => {
    expect(withText({ text: "old", size: "single" }, "   ")).toEqual({
      size: "single",
    });
  });
});

describe("computeReorder", () => {
  const widgets = [
    widget({ id: "a", position: 0 }),
    widget({ id: "b", position: 1 }),
    widget({ id: "c", position: 2 }),
  ];

  it("moves a widget and patches only positions that changed", () => {
    const { order, patches } = computeReorder(widgets, 0, 2);
    expect(order.map((w) => w.id)).toEqual(["b", "c", "a"]);
    expect(patches).toEqual([
      { id: "b", position: 0 },
      { id: "c", position: 1 },
      { id: "a", position: 2 },
    ]);
  });

  it("is a no-op when from equals to", () => {
    const { order, patches } = computeReorder(widgets, 1, 1);
    expect(order.map((w) => w.id)).toEqual(["a", "b", "c"]);
    expect(patches).toEqual([]);
  });

  it("normalises non-contiguous server positions", () => {
    const sparse = [
      widget({ id: "a", position: 0 }),
      widget({ id: "b", position: 3 }),
    ];
    const { patches } = computeReorder(sparse, 0, 0);
    expect(patches).toEqual([{ id: "b", position: 1 }]);
  });

  it("ignores out-of-range indices but still normalises", () => {
    const { order, patches } = computeReorder(widgets, 5, 0);
    expect(order.map((w) => w.id)).toEqual(["a", "b", "c"]);
    expect(patches).toEqual([]);
  });
});

describe("shownChartIds / isChartShown", () => {
  const all = ["c-1", "c-2", "c-3"];

  it("treats a config with no chartIds as all charts shown", () => {
    expect(shownChartIds({}, all)).toEqual(all);
    expect(isChartShown({}, "c-2", all)).toBe(true);
  });

  it("returns the explicit subset in insight-chart order", () => {
    expect(shownChartIds({ chartIds: ["c-3", "c-1"] }, all)).toEqual([
      "c-1",
      "c-3",
    ]);
    expect(isChartShown({ chartIds: ["c-1"] }, "c-2", all)).toBe(false);
  });
});

describe("withChartShown", () => {
  const all = ["c-1", "c-2", "c-3"];

  it("adds a chart to an explicit subset, ordered", () => {
    expect(withChartShown({ chartIds: ["c-1"] }, "c-3", all)).toEqual({
      chartIds: ["c-1", "c-3"],
    });
  });

  it("drops chartIds once every chart is shown", () => {
    expect(withChartShown({ chartIds: ["c-1", "c-2"] }, "c-3", all)).toEqual(
      {}
    );
  });

  it("is a no-op on an implicit-all config", () => {
    expect(withChartShown({}, "c-2", all)).toEqual({});
  });
});

describe("withChartHidden", () => {
  const all = ["c-1", "c-2", "c-3"];

  it("materialises the subset when hiding from implicit-all", () => {
    expect(withChartHidden({}, "c-2", all)).toEqual({
      chartIds: ["c-1", "c-3"],
    });
  });

  it("removes a chart from an explicit subset", () => {
    expect(withChartHidden({ chartIds: ["c-1", "c-2"] }, "c-1", all)).toEqual({
      chartIds: ["c-2"],
    });
  });

  it("keeps an empty subset when the last shown chart is hidden", () => {
    expect(withChartHidden({ chartIds: ["c-2"] }, "c-2", all)).toEqual({
      chartIds: [],
    });
  });

  it("preserves other config keys when hiding the last chart", () => {
    expect(
      withChartHidden({ chartIds: ["c-2"], summaryHidden: true }, "c-2", all)
    ).toEqual({ chartIds: [], summaryHidden: true });
  });
});

describe("isSummaryShown / withSummaryShown", () => {
  it("is shown unless summaryHidden is exactly true", () => {
    expect(isSummaryShown({})).toBe(true);
    expect(isSummaryShown({ summaryHidden: false })).toBe(true);
    expect(isSummaryShown({ summaryHidden: "yes" })).toBe(true);
    expect(isSummaryShown({ summaryHidden: true })).toBe(false);
  });

  it("withSummaryShown(false) sets the key, preserving other config keys", () => {
    expect(withSummaryShown({ chartIds: ["c-1"] }, false)).toEqual({
      chartIds: ["c-1"],
      summaryHidden: true,
    });
  });

  it("withSummaryShown(true) drops the key to keep configs tidy", () => {
    expect(
      withSummaryShown({ summaryHidden: true, size: "double" }, true)
    ).toEqual({ size: "double" });
    expect(withSummaryShown({}, true)).toEqual({});
  });
});

describe("moduleTitle", () => {
  it("prefers a non-blank config.title override", () => {
    expect(moduleTitle(widget({ config: { title: "Renamed" } }))).toBe(
      "Renamed"
    );
    expect(moduleTitle(widget({ config: { title: "   " } }))).toBe(
      "Annual tree cover loss"
    );
  });

  it("falls back to the first chart's title in position order, even when hidden", () => {
    const w = widget({
      config: { chartIds: ["c-2"] },
      insight: {
        id: "ins-1",
        insight_text: null,
        codeact_parts: null,
        charts: [
          chart({ id: "c-2", position: 1, title: "Second" }),
          chart({ id: "c-1", position: 0, title: "First" }),
        ],
      },
    });
    expect(moduleTitle(w)).toBe("First");
  });

  it('falls back to "Analysis" when there are no charts', () => {
    expect(moduleTitle(widget({ insight: null }))).toBe("Analysis");
    expect(
      moduleTitle(
        widget({
          insight: { id: "i", insight_text: null, charts: [] },
        })
      )
    ).toBe("Analysis");
  });
});

describe("insightModule", () => {
  it("assembles title, summary, shown cards and the full chart list", () => {
    const vm = insightModule(
      widget({
        config: { chartIds: ["c-2"], titles: { "c-2": "Renamed B" } },
        insight: {
          id: "ins-1",
          insight_text: "Narrative.",
          codeact_parts: null,
          charts: [
            chart({ id: "c-1", position: 0, title: "First" }),
            chart({ id: "c-2", position: 1, title: "Second" }),
          ],
        },
      }),
      { areaName: "Paraná, Brazil" }
    );
    expect(vm.title).toBe("First");
    expect(vm.summaryText).toBe("Narrative.");
    expect(vm.summaryShown).toBe(true);
    expect(vm.cards.map((c) => c.id)).toEqual(["c-2"]);
    expect(vm.cards[0].analysisParams).toEqual({ areas: ["Paraná, Brazil"] });
    expect(vm.allCharts).toEqual([
      { id: "c-1", title: "First", shown: false },
      { id: "c-2", title: "Renamed B", shown: true },
    ]);
  });

  it("reflects a hidden summary and blank narrative as empty text", () => {
    const vm = insightModule(
      widget({
        config: { summaryHidden: true },
        insight: {
          id: "ins-1",
          insight_text: "   ",
          codeact_parts: null,
          charts: [chart()],
        },
      })
    );
    expect(vm.summaryShown).toBe(false);
    expect(vm.summaryText).toBe("");
  });

  it("handles a missing insight with empty lists", () => {
    const vm = insightModule(widget({ insight: null }));
    expect(vm.title).toBe("Analysis");
    expect(vm.cards).toEqual([]);
    expect(vm.allCharts).toEqual([]);
  });

  it("derives curated from the generation provenance, like the cards do", () => {
    // The default fixture has no codeact parts.
    expect(insightModule(widget()).curated).toBe(true);
    const generated = widget({
      insight: {
        id: "ins-1",
        insight_text: "Loss rose 12%.",
        codeact_parts: [{ type: "code", content: "df.plot()" }],
        charts: [chart()],
      },
    });
    expect(insightModule(generated).curated).toBe(false);
  });
});

describe("dashboardWidgetToInsightWidgets — chartIds filtering", () => {
  function twoChartWidget(config: Record<string, unknown>): DashboardWidget {
    return widget({
      config,
      insight: {
        id: "ins-1",
        insight_text: "",
        codeact_parts: null,
        charts: [
          chart({ id: "c-1", position: 0 }),
          chart({ id: "c-2", position: 1, title: "CO2" }),
        ],
      },
    });
  }

  it("renders only the shown charts", () => {
    const out = dashboardWidgetToInsightWidgets(
      twoChartWidget({ chartIds: ["c-2"] })
    );
    expect(out.map((c) => c.id)).toEqual(["c-2"]);
  });

  it("renders all charts when config has no chartIds", () => {
    const out = dashboardWidgetToInsightWidgets(twoChartWidget({}));
    expect(out.map((c) => c.id)).toEqual(["c-1", "c-2"]);
  });
});

describe("hasWidgetCustomization", () => {
  it("is false for a widget added whole and left alone", () => {
    expect(hasWidgetCustomization({})).toBe(false);
  });

  it("is true for each thing the with* helpers write", () => {
    expect(hasWidgetCustomization(withChartSize({}, "c-1", "double"))).toBe(
      true
    );
    expect(hasWidgetCustomization(withChartTitle({}, "c-1", "Renamed"))).toBe(
      true
    );
    expect(hasWidgetCustomization(withSummaryShown({}, false))).toBe(true);
    expect(hasWidgetCustomization(withWidgetTitle({}, "Renamed"))).toBe(true);
    expect(hasWidgetCustomization(withSize({}, "double"))).toBe(true);
  });

  it("counts an all-hidden chart subset, which is an empty array", () => {
    const config = withChartHidden({ chartIds: ["c-1"] }, "c-1", ["c-1"]);
    expect(config.chartIds).toEqual([]);
    expect(hasWidgetCustomization(config)).toBe(true);
  });

  it("ignores keys the helpers clear back to their default", () => {
    expect(hasWidgetCustomization(withSummaryShown({}, true))).toBe(false);
    expect(hasWidgetCustomization(withWidgetTitle({}, "   "))).toBe(false);
    expect(hasWidgetCustomization({ sizes: {}, titles: {} })).toBe(false);
  });
});
