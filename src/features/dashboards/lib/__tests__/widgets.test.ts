import { describe, it, expect } from "vitest";

import {
  chartSize,
  chartTitleOverride,
  computeReorder,
  dashboardWidgetToInsightWidgets,
  widgetSize,
  widgetText,
  withChartSize,
  withChartTitle,
  withSize,
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
