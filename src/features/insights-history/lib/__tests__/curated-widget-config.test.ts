import { describe, expect, it } from "vitest";
import type { Chart } from "@/src/entities/insight";
import { curatedWidgetConfig } from "../curated-widget-config";

function chart(overrides: Partial<Chart>): Chart {
  return {
    id: "chart-1",
    position: 0,
    title: "",
    type: "bar",
    xAxis: "year",
    yAxis: "value",
    colorField: "",
    stackField: "",
    groupField: "",
    seriesFields: [],
    data: [],
    ...overrides,
  };
}

describe("curatedWidgetConfig", () => {
  it("titles every chart as '{dataset} in {area}'", () => {
    const config = curatedWidgetConfig(
      [chart({ id: "c1" })],
      "Integrated alerts",
      "Pará"
    );
    expect(config).toEqual({
      titles: { c1: "Integrated alerts in Pará" },
    });
  });

  it("titles a TCL analysis's emissions chart as GHG emissions", () => {
    const config = curatedWidgetConfig(
      [
        chart({ id: "loss", yAxis: "tree_cover_loss_ha" }),
        chart({ id: "emissions", yAxis: "carbon_emissions_MgCO2e" }),
      ],
      "Tree cover loss",
      "Brazil"
    );
    expect(config).toEqual({
      titles: {
        loss: "Tree cover loss in Brazil",
        emissions: "GHG Emissions from Tree Cover Loss in Brazil",
      },
    });
  });

  it("returns an empty config for an insight with no charts", () => {
    expect(curatedWidgetConfig([], "Tree cover loss", "Brazil")).toEqual({});
  });
});
