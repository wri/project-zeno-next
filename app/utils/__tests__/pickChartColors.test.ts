import { describe, expect, it } from "vitest";

import { pickChartColors } from "../pickChartColors";

describe("pickChartColors", () => {
  it("returns no fields when the backend sent none", () => {
    expect(pickChartColors({})).toEqual({});
    expect(
      pickChartColors({
        colorMap: null,
        seriesColor: null,
        divergentColors: null,
      })
    ).toEqual({});
  });

  it("treats an empty colorMap as absent so the local palette applies", () => {
    expect(pickChartColors({ colorMap: {} })).toEqual({});
  });

  it("carries a populated colorMap through", () => {
    const colorMap = { logging: "#111111", wildfire: "#222222" };
    expect(pickChartColors({ colorMap })).toEqual({ colorMap });
  });

  it("omits an empty or null seriesColor and carries a value", () => {
    expect(pickChartColors({ seriesColor: "" })).toEqual({});
    expect(pickChartColors({ seriesColor: null })).toEqual({});
    expect(pickChartColors({ seriesColor: "#abcdef" })).toEqual({
      seriesColor: "#abcdef",
    });
  });

  it("omits a null divergentColors and carries a pair", () => {
    expect(pickChartColors({ divergentColors: null })).toEqual({});
    const divergentColors = { positive: "#00ff00", negative: "#ff0000" };
    expect(pickChartColors({ divergentColors })).toEqual({ divergentColors });
  });

  it("combines whichever fields are present", () => {
    const colorMap = { a: "#000000" };
    const divergentColors = { positive: "#00ff00", negative: "#ff0000" };
    expect(
      pickChartColors({ colorMap, seriesColor: null, divergentColors })
    ).toEqual({ colorMap, divergentColors });
  });
});
