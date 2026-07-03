import { describe, it, expect } from "vitest";
import {
  dashboardWidgetToInsightWidget,
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

describe("dashboardWidgetToInsightWidget", () => {
  it("maps the snake_case REST chart to an InsightWidget", () => {
    expect(dashboardWidgetToInsightWidget(widget())).toEqual({
      id: "chart-1",
      type: "bar",
      title: "Annual tree cover loss",
      description: "Tree cover loss rose 12%.",
      data: [{ year: 2020, loss_ha: 5 }],
      xAxis: "year",
      yAxis: "loss_ha",
      insightId: "ins-1",
    });
  });

  it("returns null when the insight is not visible to the viewer", () => {
    expect(
      dashboardWidgetToInsightWidget(widget({ insight: null }))
    ).toBeNull();
  });

  it("returns null when the insight has no charts", () => {
    const w = widget();
    w.insight!.charts = [];
    expect(dashboardWidgetToInsightWidget(w)).toBeNull();
  });

  it("renders the first chart by position", () => {
    const w = widget();
    w.insight!.charts = [
      chart({ id: "chart-2", position: 1, title: "Second" }),
      chart({ id: "chart-1", position: 0, title: "First" }),
    ];
    expect(dashboardWidgetToInsightWidget(w)).toMatchObject({
      id: "chart-1",
      title: "First",
    });
  });

  it("falls back to a table for unknown chart types", () => {
    const w = widget();
    w.insight!.charts = [chart({ chart_type: "hexbin" })];
    expect(dashboardWidgetToInsightWidget(w)?.type).toBe("table");
  });

  it("lets config.title override the chart title", () => {
    const w = widget({ config: { title: "Custom title" } });
    expect(dashboardWidgetToInsightWidget(w)?.title).toBe("Custom title");
  });

  it("includes seriesFields only when non-empty", () => {
    const withSeries = widget();
    withSeries.insight!.charts = [
      chart({ series_fields: ["natural", "planted"] }),
    ];
    expect(dashboardWidgetToInsightWidget(withSeries)?.seriesFields).toEqual([
      "natural",
      "planted",
    ]);

    const emptySeries = widget();
    emptySeries.insight!.charts = [chart({ series_fields: [] })];
    expect(
      dashboardWidgetToInsightWidget(emptySeries)?.seriesFields
    ).toBeUndefined();
  });

  it("defaults the description when insight_text is missing", () => {
    const w = widget();
    w.insight!.insight_text = null;
    expect(dashboardWidgetToInsightWidget(w)?.description).toBe("");
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
