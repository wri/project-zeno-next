import { describe, expect, it } from "vitest";
import type { AnalysisInputs } from "../../model/analysis-inputs";
import type { Chart } from "../../model/chart";
import { chartsToWidgets } from "../charts-to-widgets";

const baseChart: Chart = {
  id: "c1",
  position: 0,
  type: "bar",
  title: "Tree cover loss",
  xAxis: "year",
  yAxis: "value",
  colorField: "",
  stackField: "",
  groupField: "",
  seriesFields: ["value"],
  data: [{ year: "2020", value: 100 }],
};

const NOT_RECORDED: AnalysisInputs = { recorded: false };

describe("chartsToWidgets", () => {
  it("returns an empty array when there are no charts", () => {
    expect(chartsToWidgets([], "ins-1", NOT_RECORDED)).toEqual([]);
  });

  it("maps a chart to an InsightWidget", () => {
    const widgets = chartsToWidgets([baseChart], "ins-1", NOT_RECORDED);
    expect(widgets).toHaveLength(1);
    expect(widgets[0]).toMatchObject({
      id: "c1",
      type: "bar",
      title: "Tree cover loss",
      xAxis: "year",
      yAxis: "value",
      seriesFields: ["value"],
    });
  });

  it("pivots a long-format line chart into one series per color-field value", () => {
    const [widget] = chartsToWidgets(
      [
        {
          ...baseChart,
          type: "line",
          xAxis: "alert_date",
          yAxis: "area_ha",
          colorField: "alert_confidence",
          seriesFields: [],
          data: [
            { alert_date: "2026-09-11", alert_confidence: "high", area_ha: 3 },
            { alert_date: "2026-09-11", alert_confidence: "low", area_ha: 1 },
          ],
        },
      ],
      "ins-1",
      NOT_RECORDED
    );
    expect(widget.seriesFields).toEqual(["high", "low"]);
    expect(widget.data).toEqual([
      { alert_date: "2026-09-11", high: 3, low: 1 },
    ]);
  });

  it("keeps a category that is absent on the first day through formatting", async () => {
    const { default: formatChartData } =
      await import("@/app/utils/formatCharts");
    const [widget] = chartsToWidgets(
      [
        {
          ...baseChart,
          type: "line",
          xAxis: "alert_date",
          yAxis: "area_ha",
          colorField: "alert_confidence",
          seriesFields: [],
          data: [
            { alert_date: "2026-09-11", alert_confidence: "high", area_ha: 1 },
            { alert_date: "2026-09-12", alert_confidence: "low", area_ha: 2 },
          ],
        },
      ],
      "ins-1",
      NOT_RECORDED
    );
    const { series } = formatChartData(
      widget.data,
      widget.type,
      widget.xAxis,
      widget.yAxis,
      undefined,
      widget.seriesFields
    );
    expect(series.map((s) => s.name)).toEqual(["high", "low"]);
  });

  it("falls back to 'bar' for an unknown chart type", () => {
    const widgets = chartsToWidgets(
      [{ ...baseChart, type: "nonsense" }],
      "ins-1",
      NOT_RECORDED
    );
    expect(widgets[0].type).toBe("bar");
  });

  it("stamps the insight's recorded inputs on every widget", () => {
    const inputs: AnalysisInputs = {
      recorded: true,
      areas: [{ name: "Brazil", ref: { source: "gadm", srcId: "BRA" } }],
      datasets: [{ name: "Tree cover loss", id: 4 }],
      canopyCover: [30],
      years: [{ start: 2001, end: 2024 }],
    };
    const widgets = chartsToWidgets(
      [baseChart, { ...baseChart, id: "c2", position: 1 }],
      "ins-1",
      inputs
    );
    expect(widgets.map((w) => w.analysisInputs)).toEqual([inputs, inputs]);
  });

  it("stamps the insight id and each chart's position on every widget", () => {
    const widgets = chartsToWidgets(
      [baseChart, { ...baseChart, id: "c2", position: 1 }],
      "ins-1",
      NOT_RECORDED
    );
    expect(widgets.map((w) => [w.insightId, w.chartPosition])).toEqual([
      ["ins-1", 0],
      ["ins-1", 1],
    ]);
  });
});
