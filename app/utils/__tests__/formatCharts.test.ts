import { describe, it, expect } from "vitest";
import formatChartData, {
  toAxisLabel,
  formatYAxisLabel,
  formatXAxisLabel,
  formatTooltipValue,
} from "../formatCharts";

describe("toAxisLabel", () => {
  it("extracts area unit suffixes", () => {
    expect(toAxisLabel("area_km2")).toBe("Area (km²)");
    expect(toAxisLabel("tree_cover_loss_ha")).toBe("Tree cover loss (ha)");
  });

  it("recognises CO₂e unit suffixes used by the GHG datasets", () => {
    expect(toAxisLabel("net_flux_tCO2e")).toBe("Net flux (tCO₂e)");
    expect(toAxisLabel("emissions_tco2e")).toBe("Emissions (tCO₂e)");
    expect(toAxisLabel("emissions_mgco2e")).toBe("Emissions (MgCO₂e)");
    expect(toAxisLabel("emission_factor_tco2e_per_tonne")).toBe(
      "Emission factor (tCO₂e/t)"
    );
  });

  it("maps _mt to megatonnes, not tonnes", () => {
    expect(toAxisLabel("carbon_emissions_mt")).toBe("Carbon emissions (Mt)");
  });

  it("still maps plain tonne suffixes to t", () => {
    expect(toAxisLabel("production_tonnes")).toBe("Production (t)");
    expect(toAxisLabel("weight_t")).toBe("Weight (t)");
  });

  it("extracts percentage suffixes", () => {
    expect(toAxisLabel("pct_of_total")).toBe("Pct of total");
    expect(toAxisLabel("change_pct")).toBe("Change (%)");
  });

  it("humanises snake_case and camelCase without units", () => {
    expect(toAxisLabel("land_cover_type")).toBe("Land cover type");
    expect(toAxisLabel("gdpPerCapita")).toBe("Gdp per capita");
  });

  it("returns empty string for empty input", () => {
    expect(toAxisLabel("")).toBe("");
  });
});

describe("formatYAxisLabel", () => {
  it("passes years through unchanged", () => {
    expect(formatYAxisLabel(2023, "year")).toBe("2023");
  });

  it("returns 0 for zero", () => {
    expect(formatYAxisLabel(0)).toBe("0");
  });

  it("keeps small values locale-formatted", () => {
    expect(formatYAxisLabel(999)).toBe("999");
    expect(formatYAxisLabel(-450)).toBe("-450");
  });

  it("compacts thousands/millions/billions and strips trailing .0", () => {
    expect(formatYAxisLabel(1500)).toBe("1.5K");
    expect(formatYAxisLabel(2000)).toBe("2K");
    expect(formatYAxisLabel(4_510_000)).toBe("4.5M");
    expect(formatYAxisLabel(3_000_000_000)).toBe("3B");
  });

  it("promotes to the next unit when rounding crosses it", () => {
    expect(formatYAxisLabel(999_950)).toBe("1M");
  });

  it("formats negative magnitudes", () => {
    expect(formatYAxisLabel(-45_000)).toBe("-45K");
    expect(formatYAxisLabel(-2_500_000)).toBe("-2.5M");
  });
});

describe("formatXAxisLabel", () => {
  it("passes years through unchanged", () => {
    expect(formatXAxisLabel(2023, "year")).toBe("2023");
  });

  it("truncates long category labels", () => {
    expect(formatXAxisLabel("Tropical moist broadleaf forests")).toBe(
      "Tropical moi…"
    );
  });

  it("keeps short labels intact", () => {
    expect(formatXAxisLabel("Brazil")).toBe("Brazil");
  });
});

describe("formatTooltipValue", () => {
  it("formats numbers with locale separators and 2dp max", () => {
    expect(formatTooltipValue(4812000)).toBe("4,812,000");
    expect(formatTooltipValue(1234567.891)).toBe("1,234,567.89");
  });

  it("passes years through unchanged", () => {
    expect(formatTooltipValue(2023, "year")).toBe("2023");
  });

  it("parses numeric strings", () => {
    expect(formatTooltipValue("4500")).toBe("4,500");
  });

  it("returns non-numeric values as-is", () => {
    expect(formatTooltipValue("Brazil")).toBe("Brazil");
    expect(formatTooltipValue("")).toBe("");
  });
});

describe("formatChartData", () => {
  it("returns empty result for empty or invalid data", () => {
    expect(formatChartData([], "bar", "x", "y")).toEqual({
      data: [],
      series: [],
    });
    expect(formatChartData(null, "bar", "x", "y")).toEqual({
      data: [],
      series: [],
    });
  });

  it("builds a single series for a simple bar chart", () => {
    const data = [
      { country: "Brazil", area_ha: 100 },
      { country: "Peru", area_ha: 50 },
    ];
    const result = formatChartData(data, "bar", "country", "area_ha");
    expect(result.series).toHaveLength(1);
    expect(result.series[0].name).toBe("area_ha");
    expect(result.data).toHaveLength(2);
  });

  it("preserves negative values for divergent datasets", () => {
    const data = [
      { country: "Brazil", net_flux_tCO2e: -450 },
      { country: "Indonesia", net_flux_tCO2e: 320 },
    ];
    const result = formatChartData(
      data,
      "bar",
      "country",
      "net_flux_tCO2e",
      "Forest greenhouse gas net flux (2001-2024)"
    );
    expect(result.data[0].net_flux_tCO2e).toBe(-450);
    // Per-bar colors assigned by sign
    expect(result.data[0]._barColor).not.toBe(result.data[1]._barColor);
  });

  it("creates one series per metric column for multi-series line charts", () => {
    const data = [
      { year: 2020, Brazil: 100, Peru: 50 },
      { year: 2021, Brazil: 90, Peru: 60 },
    ];
    const result = formatChartData(data, "line", "year");
    expect(result.series.map((s) => s.name)).toEqual(["Brazil", "Peru"]);
  });

  it("pivots long-format data for grouped bars", () => {
    const data = [
      { region: "A", year: "2020", area_km2: 10 },
      { region: "A", year: "2021", area_km2: 12 },
      { region: "B", year: "2020", area_km2: 8 },
      { region: "B", year: "2021", area_km2: 9 },
    ];
    const result = formatChartData(data, "grouped-bar", "region", "area_km2");
    expect(result.series.map((s) => s.name)).toEqual(["2020", "2021"]);
    expect(result.data).toHaveLength(2);
    expect(result.data[0]).toMatchObject({ region: "A", 2020: 10, 2021: 12 });
  });

  describe("stacked-bar-with-line", () => {
    it("stacks the series fields and renders the line field on top, unstacked", () => {
      // The line's value is precomputed by the caller (net-flux-variants), not
      // by formatChartData — this only decides how to render an existing column.
      const data = [
        { year: 2020, Emissions: 100, Removals: -40, "Net flux": 60 },
        { year: 2021, Emissions: 90, Removals: -50, "Net flux": 40 },
      ];
      const result = formatChartData(
        data,
        "stacked-bar-with-line",
        "year",
        undefined,
        undefined,
        ["Emissions", "Removals"],
        undefined,
        "Net flux"
      );
      expect(result.series.map((s) => s.name)).toEqual([
        "Emissions",
        "Removals",
        "Net flux",
      ]);
      expect(result.series[0].stackId).toBe("a");
      expect(result.series[1].stackId).toBe("a");
      expect(result.series[2].stackId).toBeUndefined();
      expect(result.data[0]["Net flux"]).toBe(60);
      expect(result.data[1]["Net flux"]).toBe(40);
    });

    it("takes per-series colors from the backend colorMap, falling back to the rotation", () => {
      const data = [{ year: 2020, Emissions: 100, Removals: -40, Other: 5 }];
      const result = formatChartData(
        data,
        "stacked-bar-with-line",
        "year",
        undefined,
        undefined,
        ["Emissions", "Removals", "Other"],
        { colorMap: { Emissions: "#8c510a", Removals: "url(#hatch)" } }
      );
      const byName = Object.fromEntries(
        result.series.map((s) => [s.name, s.color])
      );
      expect(byName.Emissions).toBe("#8c510a");
      // SVG paint references pass through untouched, so a series can be hatched.
      expect(byName.Removals).toBe("url(#hatch)");
      // No registry entry → default rotation, so it still renders.
      expect(byName.Other).toBeTruthy();
      expect(byName.Other).not.toBe("#8c510a");
    });

    it("tints a single divergent series by sign, mirroring the plain bar branch", () => {
      const data = [
        { year: 2020, "Net source": 850, "Net flux": 850 },
        { year: 2021, "Net source": -120, "Net flux": -120 },
      ];
      const result = formatChartData(
        data,
        "stacked-bar-with-line",
        "year",
        undefined,
        undefined,
        ["Net source"],
        {
          divergentColors: { positive: "#8c510a", negative: "#01665e" },
        },
        "Net flux"
      );
      expect(result.series.map((s) => s.name)).toEqual([
        "Net source",
        "Net flux",
      ]);
      expect(result.data[0]._barColor).toBe("#8c510a");
      expect(result.data[1]._barColor).toBe("#01665e");
    });
  });

  it("keeps the name column for scatter charts (regression)", () => {
    const data = [
      { country: "Brazil", gdp_per_capita: 8900, deforestation_ha: 4812000 },
      { country: "Peru", gdp_per_capita: 6700, deforestation_ha: 310000 },
    ];
    const result = formatChartData(
      data,
      "scatter",
      "gdp_per_capita",
      "deforestation_ha"
    );
    expect(result.data).toHaveLength(2);
    expect(result.data[0].name).toBe("Brazil");
  });

  it("assigns domain colors to known pie categories", () => {
    const data = [
      { driver: "Logging", area_ha: 100 },
      { driver: "Wildfire", area_ha: 50 },
    ];
    const result = formatChartData(data, "pie", "driver", "area_ha");
    const logging = result.series.find((s) => s.name === "Logging");
    expect(logging?.color).toBe("#52A44E");
  });

  describe("backend color overrides (phase 2)", () => {
    it("prefers the backend colorMap over the local mapping for pie charts, keyed by slug", () => {
      const data = [
        { driver: "Tala", driver__slug: "logging", area_ha: 100 },
        { driver: "Incendio", driver__slug: "wildfire", area_ha: 50 },
      ];
      const result = formatChartData(
        data,
        "pie",
        "driver",
        "area_ha",
        undefined,
        undefined,
        {
          colorMap: { logging: "#111111", wildfire: "#222222" },
        }
      );
      const logging = result.series.find((s) => s.name === "Tala");
      const wildfire = result.series.find((s) => s.name === "Incendio");
      expect(logging?.color).toBe("#111111");
      expect(wildfire?.color).toBe("#222222");
    });

    it("falls back to the row value as the slug when no __slug column is present", () => {
      const data = [{ category: "agriculture", value: 10 }];
      const result = formatChartData(
        data,
        "pie",
        "category",
        "value",
        undefined,
        undefined,
        {
          colorMap: { agriculture: "#333333" },
        }
      );
      expect(result.data[0].color).toBe("#333333");
    });

    it("builds pie colors from the backend colorMap when there is no local palette for the field", () => {
      const data = [
        { class: "Natural", class__slug: "natural", value: 10 },
        { class: "Non-natural", class__slug: "non_natural", value: 5 },
      ];
      const result = formatChartData(
        data,
        "pie",
        "class",
        "value",
        undefined,
        undefined,
        {
          colorMap: { natural: "#4CAF50", non_natural: "#9E9E9E" },
        }
      );
      expect(result.series).toEqual([
        { name: "Natural", color: "#4CAF50" },
        { name: "Non-natural", color: "#9E9E9E" },
      ]);
    });

    it("prefers backend seriesColor over the local DATASET_SERIES_COLORS map", () => {
      const data = [
        { country: "Brazil", area_ha: 100 },
        { country: "Peru", area_ha: 50 },
      ];
      const result = formatChartData(
        data,
        "bar",
        "country",
        "area_ha",
        "Tree cover loss",
        undefined,
        { seriesColor: "#ABCDEF" }
      );
      expect(result.series[0].color).toBe("#ABCDEF");
    });

    it("prefers backend divergentColors over the local DATASET_DIVERGENT_COLORS map", () => {
      const data = [
        { country: "Brazil", net_flux_tCO2e: -450 },
        { country: "Indonesia", net_flux_tCO2e: 320 },
      ];
      const result = formatChartData(
        data,
        "bar",
        "country",
        "net_flux_tCO2e",
        "Forest greenhouse gas net flux (2001-2024)",
        undefined,
        { divergentColors: { positive: "#00FF00", negative: "#FF0000" } }
      );
      expect(result.data[0]._barColor).toBe("#FF0000");
      expect(result.data[1]._barColor).toBe("#00FF00");
    });
  });
});
