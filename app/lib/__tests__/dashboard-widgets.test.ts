import { describe, it, expect } from "vitest";
import {
  computeReorder,
  dashboardWidgetToInsightWidgets,
  dashboardWidgetToMapSpec,
} from "@/app/lib/dashboard-widgets";
import type {
  DashboardChart,
  DashboardWidget,
} from "@/app/schemas/api/dashboards/get";

function chart(partial: Partial<DashboardChart> = {}): DashboardChart {
  return {
    id: "chart-1",
    position: 0,
    title: "Annual tree cover loss",
    chart_type: "bar",
    x_axis: "year",
    y_axis: "loss_ha",
    chart_data: [{ year: 2020, loss_ha: 5 }],
    ...partial,
  };
}

function widget(partial: Partial<DashboardWidget> = {}): DashboardWidget {
  return {
    id: "w-1",
    position: 0,
    widget_type: "insight",
    insight_id: "ins-1",
    config: {},
    insight: {
      id: "ins-1",
      insight_text: "Tree cover loss rose 12%.",
      charts: [chart()],
      created_at: "2026-07-01T09:00:00",
    },
    ...partial,
  };
}

describe("dashboardWidgetToInsightWidgets", () => {
  it("maps the snake_case REST chart to an InsightWidget", () => {
    expect(dashboardWidgetToInsightWidgets(widget())).toEqual([
      {
        id: "chart-1",
        type: "bar",
        title: "Annual tree cover loss",
        description: "Tree cover loss rose 12%.",
        data: [{ year: 2020, loss_ha: 5 }],
        xAxis: "year",
        yAxis: "loss_ha",
        insightId: "ins-1",
      },
    ]);
  });

  it("returns [] when the insight is not visible to the viewer", () => {
    expect(dashboardWidgetToInsightWidgets(widget({ insight: null }))).toEqual(
      []
    );
  });

  it("returns [] when the insight has no charts", () => {
    const w = widget();
    w.insight!.charts = [];
    expect(dashboardWidgetToInsightWidgets(w)).toEqual([]);
  });

  it("renders every chart, ordered by position", () => {
    const w = widget();
    w.insight!.charts = [
      chart({ id: "chart-2", position: 1, title: "Second" }),
      chart({ id: "chart-1", position: 0, title: "First" }),
    ];
    const widgets = dashboardWidgetToInsightWidgets(w);
    expect(widgets.map((x) => x.id)).toEqual(["chart-1", "chart-2"]);
    // The insight text belongs to the widget, not each chart — first card only.
    expect(widgets.map((x) => x.description)).toEqual([
      "Tree cover loss rose 12%.",
      "",
    ]);
  });

  it("falls back to a table for unknown chart types", () => {
    const w = widget();
    w.insight!.charts = [chart({ chart_type: "hexbin" })];
    expect(dashboardWidgetToInsightWidgets(w)[0]?.type).toBe("table");
  });

  it("lets config.title override only the first chart title", () => {
    const w = widget({ config: { title: "Custom title" } });
    w.insight!.charts = [
      chart(),
      chart({ id: "chart-2", position: 1, title: "Second" }),
    ];
    const widgets = dashboardWidgetToInsightWidgets(w);
    expect(widgets.map((x) => x.title)).toEqual(["Custom title", "Second"]);
  });

  it("includes seriesFields only when non-empty", () => {
    const withSeries = widget();
    withSeries.insight!.charts = [
      chart({ series_fields: ["natural", "planted"] }),
    ];
    expect(
      dashboardWidgetToInsightWidgets(withSeries)[0]?.seriesFields
    ).toEqual(["natural", "planted"]);

    const emptySeries = widget();
    emptySeries.insight!.charts = [chart({ series_fields: [] })];
    expect(
      dashboardWidgetToInsightWidgets(emptySeries)[0]?.seriesFields
    ).toBeUndefined();
  });

  it("defaults the description when insight_text is missing", () => {
    const w = widget();
    w.insight!.insight_text = null;
    expect(dashboardWidgetToInsightWidgets(w)[0]?.description).toBe("");
  });

  it("passes provenance parts through as generation", () => {
    const w = widget();
    w.insight!.codeact_parts = [{ type: "code_block", content: "YmFzZTY0" }];
    expect(dashboardWidgetToInsightWidgets(w)[0]?.generation).toEqual({
      codeact_parts: [{ type: "code_block", content: "YmFzZTY0" }],
    });

    expect(dashboardWidgetToInsightWidgets(widget())[0]).not.toHaveProperty(
      "generation"
    );
  });
});

function mapWidget(
  config: NonNullable<DashboardWidget["config"]>
): DashboardWidget {
  return {
    id: "w-map",
    position: 0,
    widget_type: "map",
    insight_id: null,
    insight: null,
    config,
  };
}

describe("dashboardWidgetToMapSpec", () => {
  const dataset = {
    dataset_name: "Tree cover loss",
    tile_url: "https://tiles.example.com/tcl/{z}/{x}/{y}.png",
    context_layer: null,
    context_layers: null,
    start_date: "2024-01-01",
    end_date: "2024-12-31",
  };

  it("maps a dataset widget to title, caption and tile URL", () => {
    expect(dashboardWidgetToMapSpec(mapWidget({ dataset }))).toEqual({
      title: "Tree cover loss",
      caption: "2024-01-01 – 2024-12-31",
      tileUrls: ["https://tiles.example.com/tcl/{z}/{x}/{y}.png"],
      kind: "dataset",
    });
  });

  it("lets config.title override the dataset name", () => {
    expect(
      dashboardWidgetToMapSpec(mapWidget({ title: "Custom", dataset }))?.title
    ).toBe("Custom");
  });

  it("renders the active raster context layer beneath the main layer", () => {
    const spec = dashboardWidgetToMapSpec(
      mapWidget({
        dataset: {
          ...dataset,
          context_layer: "driver",
          context_layers: [
            { name: "driver", tile_url: "https://tiles.example.com/driver" },
            { name: "other", tile_url: "https://tiles.example.com/other" },
          ],
        },
      })
    );
    expect(spec?.tileUrls).toEqual([
      "https://tiles.example.com/driver",
      dataset.tile_url,
    ]);
  });

  it("skips vector context layers", () => {
    const spec = dashboardWidgetToMapSpec(
      mapWidget({
        dataset: {
          ...dataset,
          context_layer: "intact_forest",
          context_layers: [
            {
              name: "intact_forest",
              tile_url: "https://tiles.example.com/ifl/{z}/{x}/{y}.pbf",
              source_layer: "ifl",
            },
          ],
        },
      })
    );
    expect(spec?.tileUrls).toEqual([dataset.tile_url]);
  });

  it("routes primary forest context tiles through the pf:// protocol", () => {
    const spec = dashboardWidgetToMapSpec(
      mapWidget({
        dataset: {
          ...dataset,
          context_layer: "primary_forest",
          context_layers: [
            {
              name: "primary_forest",
              tile_url:
                "https://tiles.example.com/umd_regional_primary_forest/{z}/{x}/{y}.png",
            },
          ],
        },
      })
    );
    expect(spec?.tileUrls[0]).toBe(
      "pf://https://tiles.example.com/umd_regional_primary_forest/{z}/{x}/{y}.png"
    );
  });

  it("maps an imagery widget", () => {
    expect(
      dashboardWidgetToMapSpec(
        mapWidget({
          imagery: {
            tile_url: "https://tiles.example.com/mosaic/{z}/{x}/{y}.png",
            tilejson_url: "https://tiles.example.com/mosaic/tilejson.json",
            target_date: "2024-06-01",
            aoi_names: ["Paraná"],
          },
        })
      )
    ).toEqual({
      title: "Satellite imagery",
      caption: "Paraná · 2024-06-01",
      tileUrls: ["https://tiles.example.com/mosaic/{z}/{x}/{y}.png"],
      kind: "imagery",
      tilejsonUrl: "https://tiles.example.com/mosaic/tilejson.json",
    });
  });

  it("omits tilejsonUrl when the imagery config has none", () => {
    const spec = dashboardWidgetToMapSpec(
      mapWidget({
        imagery: {
          tile_url: "https://tiles.example.com/mosaic/{z}/{x}/{y}.png",
        },
      })
    );
    expect(spec).not.toHaveProperty("tilejsonUrl");
  });

  it("returns null when there is no renderable tile URL", () => {
    expect(dashboardWidgetToMapSpec(mapWidget({}))).toBeNull();
    expect(
      dashboardWidgetToMapSpec(
        mapWidget({ dataset: { ...dataset, tile_url: null } })
      )
    ).toBeNull();
  });
});

describe("computeReorder", () => {
  const orderIds = (widgets: DashboardWidget[]) => widgets.map((w) => w.id);
  const make = (id: string, position: number): DashboardWidget => ({
    ...widget({ id, position }),
  });

  it("moves a widget forward and patches only changed positions", () => {
    const widgets = [make("a", 0), make("b", 1), make("c", 2)];
    const { order, patches } = computeReorder(widgets, 0, 2);
    expect(orderIds(order)).toEqual(["b", "c", "a"]);
    expect(patches).toEqual([
      { id: "b", position: 0 },
      { id: "c", position: 1 },
      { id: "a", position: 2 },
    ]);
  });

  it("moves a widget backward", () => {
    const widgets = [make("a", 0), make("b", 1), make("c", 2)];
    const { order, patches } = computeReorder(widgets, 2, 0);
    expect(orderIds(order)).toEqual(["c", "a", "b"]);
    expect(patches).toEqual([
      { id: "c", position: 0 },
      { id: "a", position: 1 },
      { id: "b", position: 2 },
    ]);
  });

  it("patches nothing on a no-op move over contiguous positions", () => {
    const widgets = [make("a", 0), make("b", 1)];
    const { order, patches } = computeReorder(widgets, 1, 1);
    expect(orderIds(order)).toEqual(["a", "b"]);
    expect(patches).toEqual([]);
  });

  it("leaves untouched adjacent widgets out of the patch set", () => {
    const widgets = [make("a", 0), make("b", 1), make("c", 2), make("d", 3)];
    const { patches } = computeReorder(widgets, 1, 2);
    expect(patches).toEqual([
      { id: "c", position: 1 },
      { id: "b", position: 2 },
    ]);
  });

  it("normalises non-contiguous server positions", () => {
    // Positions with gaps (e.g. after deletions) get rewritten to indexes.
    const widgets = [make("a", 0), make("b", 2), make("c", 5)];
    const { patches } = computeReorder(widgets, 2, 2);
    expect(patches).toEqual([
      { id: "b", position: 1 },
      { id: "c", position: 2 },
    ]);
  });

  it("ignores out-of-range indexes", () => {
    const widgets = [make("a", 0), make("b", 1)];
    const { order, patches } = computeReorder(widgets, 0, 5);
    expect(orderIds(order)).toEqual(["a", "b"]);
    expect(patches).toEqual([]);
  });
});
