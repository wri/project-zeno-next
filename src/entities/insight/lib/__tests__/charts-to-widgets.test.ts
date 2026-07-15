import { describe, expect, it } from "vitest";
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

describe("chartsToWidgets", () => {
  it("returns an empty array when there are no charts", () => {
    expect(chartsToWidgets([])).toEqual([]);
  });

  it("maps a chart to an InsightWidget", () => {
    const widgets = chartsToWidgets([baseChart]);
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

  it("falls back to 'bar' for an unknown chart type", () => {
    const widgets = chartsToWidgets([{ ...baseChart, type: "nonsense" }]);
    expect(widgets[0].type).toBe("bar");
  });

  it("attaches analysisParams to every widget when supplied", () => {
    const widgets = chartsToWidgets(
      [baseChart, { ...baseChart, id: "c2", position: 1 }],
      { areas: ["Brazil"] }
    );
    expect(widgets.map((w) => w.analysisParams)).toEqual([
      { areas: ["Brazil"] },
      { areas: ["Brazil"] },
    ]);
  });

  it("omits analysisParams when none supplied", () => {
    expect(chartsToWidgets([baseChart])[0].analysisParams).toBeUndefined();
  });
});
