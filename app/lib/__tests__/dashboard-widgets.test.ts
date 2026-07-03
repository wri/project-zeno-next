import { describe, it, expect } from "vitest";
import { dashboardWidgetToInsightWidget } from "@/app/lib/dashboard-widgets";
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
