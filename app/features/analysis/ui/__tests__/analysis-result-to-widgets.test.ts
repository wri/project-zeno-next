import { describe, expect, it } from "vitest";
import type { AnalysisResult } from "../../domain/analysis-result";
import { analysisResultToWidgets } from "../analysis-result-to-widgets";

const baseChart = {
  id: "c1",
  position: 0,
  type: "bar",
  title: "Tree cover loss",
  description: "Annual loss in Brazil",
  xAxis: "year",
  yAxis: "value",
  colorField: "",
  stackField: "",
  groupField: "",
  seriesFields: ["value"],
  data: [{ year: "2020", value: 100 }],
} as const;

describe("analysisResultToWidgets", () => {
  it("returns an empty array when there are no charts", () => {
    const result: AnalysisResult = { id: "r1", charts: [] };
    expect(analysisResultToWidgets(result)).toEqual([]);
  });

  it("maps a chart to an InsightWidget", () => {
    const result: AnalysisResult = {
      id: "r1",
      charts: [baseChart],
      params: { source: "gadm", srcId: "BRA", name: "Brazil" },
    };

    const widgets = analysisResultToWidgets(result);

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

  it("includes analysisParams when result has params", () => {
    const result: AnalysisResult = {
      id: "r1",
      charts: [baseChart],
      params: { source: "gadm", srcId: "BRA", name: "Brazil" },
    };

    const widgets = analysisResultToWidgets(result);

    expect(widgets[0].analysisParams).toEqual({ areas: ["Brazil"] });
  });

  it("omits analysisParams when result has no params", () => {
    const result: AnalysisResult = {
      id: "r1",
      charts: [baseChart],
    };

    const widgets = analysisResultToWidgets(result);

    expect(widgets[0].analysisParams).toBeUndefined();
  });

  it("maps multiple charts to multiple widgets", () => {
    const result: AnalysisResult = {
      id: "r1",
      charts: [
        baseChart,
        {
          ...baseChart,
          id: "c2",
          position: 1,
          type: "line",
          title: "Cumulative",
        },
      ],
    };

    expect(analysisResultToWidgets(result)).toHaveLength(2);
  });
});
