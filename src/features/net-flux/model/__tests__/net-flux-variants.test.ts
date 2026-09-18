import { describe, expect, it } from "vitest";
import {
  csvColumnName,
  deriveNetFluxVariant,
  isPaintReference,
  netFluxCsvRows,
  netFluxTableProps,
  netFluxTooltipRows,
  seriesGroup,
  seriesLabel,
  tooltipSeriesLabel,
  HATCH_CROPLAND,
  HATCH_LIVESTOCK,
  NET_FLUX_LINE_FIELD,
  type NetFluxVariant,
} from "../net-flux-variants";
import type { InsightWidget } from "@/app/types/chat";
import {
  CATEGORY_NET,
  CATEGORY_WIDGET,
  DETAIL_LEVEL_WIDGETS,
} from "./fixtures";

describe("seriesGroup", () => {
  it("reads the side off the backend's field suffix", () => {
    expect(seriesGroup("vegetation_emissions")).toBe("emissions");
    expect(seriesGroup("tree_gain_removals")).toBe("removals");
  });

  it("returns null for a field that is not a flux series", () => {
    expect(seriesGroup("year")).toBeNull();
    expect(seriesGroup("aoi_id")).toBeNull();
  });
});

describe("seriesLabel", () => {
  it("maps the class prefix to the backend's own display label", () => {
    expect(seriesLabel("tree_loss_emissions")).toBe("Tree loss");
    expect(seriesLabel("organic_soil_emissions")).toBe("Organic soil");
    expect(seriesLabel("land_use_removals")).toBe("Land use");
  });

  it("uses the full class name on both sides", () => {
    expect(seriesLabel("trees_remaining_trees_emissions")).toBe(
      "Trees remaining trees"
    );
    expect(seriesLabel("trees_remaining_trees_removals")).toBe(
      "Trees remaining trees"
    );
  });

  it("names the non-trees class as non-tree vegetation on both sides", () => {
    expect(seriesLabel("non_trees_remaining_non_trees_emissions")).toBe(
      "Non-tree vegetation"
    );
    expect(seriesLabel("non_trees_remaining_non_trees_removals")).toBe(
      "Non-tree vegetation"
    );
  });

  it("keeps the soil qualifier on both sides", () => {
    expect(seriesLabel("mineral_soil_emissions")).toBe("Mineral soil");
    expect(seriesLabel("mineral_soil_removals")).toBe("Mineral soil");
  });

  it("marks the two agriculture classes as the fixed 2020 figure", () => {
    expect(seriesLabel("cropland_management_emissions")).toBe(
      "Cropland management (2020, static)"
    );
    expect(seriesLabel("livestock_emissions")).toBe("Livestock (2020, static)");
  });

  it("keeps the static caveat on the raw `cropland` spelling, through the shared rename", () => {
    // `lgms-labels` names `cropland` "Cropland management" (the tree's node
    // arrives as "Crop management"); the caveat is appended after that rename.
    expect(seriesLabel("cropland_emissions")).toBe(
      "Cropland management (2020, static)"
    );
  });

  it("degrades readably for a class it has never seen", () => {
    expect(seriesLabel("peat_burning_emissions")).toBe("peat burning");
  });
});

describe("tooltipSeriesLabel", () => {
  it("abbreviates the two agriculture classes, keeping the static caveat", () => {
    expect(tooltipSeriesLabel("cropland_management_emissions")).toBe(
      "Cropland mgmt (static)"
    );
    expect(tooltipSeriesLabel("livestock_emissions")).toBe(
      "Livestock (static)"
    );
  });

  it("abbreviates the longest emissions label", () => {
    expect(tooltipSeriesLabel("trees_remaining_trees_emissions")).toBe(
      "Trees rem. trees"
    );
  });

  it("prints non-tree vegetation in full on both sides, as the legend does", () => {
    expect(tooltipSeriesLabel("non_trees_remaining_non_trees_emissions")).toBe(
      "Non-tree vegetation"
    );
    expect(tooltipSeriesLabel("non_trees_remaining_non_trees_removals")).toBe(
      "Non-tree vegetation"
    );
  });

  it("abbreviates the removals side the same way as emissions", () => {
    expect(tooltipSeriesLabel("trees_remaining_trees_removals")).toBe(
      "Trees rem. trees"
    );
  });

  it("otherwise prints the legend's own label", () => {
    expect(tooltipSeriesLabel("tree_loss_emissions")).toBe("Tree loss");
    expect(tooltipSeriesLabel("agriculture_emissions")).toBe("Agriculture");
  });
});

describe("deriveNetFluxVariant — gross", () => {
  it("keeps the backend's series and order", () => {
    const variant = deriveNetFluxVariant(CATEGORY_WIDGET, "gross");
    expect(variant.seriesFields).toEqual(CATEGORY_WIDGET.seriesFields);
  });

  it("adds the net-flux line, which the backend does not send", () => {
    const variant = deriveNetFluxVariant(CATEGORY_WIDGET, "gross");
    expect(variant.data[0]["Net flux"]).toBe(CATEGORY_NET);
  });

  it("colours every series, hatching the fixed-2020 agriculture ones", () => {
    const { colorMap } = deriveNetFluxVariant(CATEGORY_WIDGET, "gross");
    for (const field of CATEGORY_WIDGET.seriesFields ?? []) {
      expect(colorMap[field]).toBeTruthy();
    }
    expect(colorMap.vegetation_emissions).toBe("#8c510a");
    expect(colorMap.vegetation_removals).toBe("#01665e");
    expect(isPaintReference(colorMap.cropland_management_emissions)).toBe(true);
    expect(isPaintReference(colorMap.livestock_emissions)).toBe(true);
  });

  it("groups the legend by suffix, emissions top-of-stack first", () => {
    const { legend } = deriveNetFluxVariant(CATEGORY_WIDGET, "gross");
    expect(legend.layout).toBe("grouped");
    // Reversed relative to stacking order, so it reads down the bar.
    expect(legend.emissions.map((i) => i.label)).toEqual([
      "Livestock (2020, static)",
      "Cropland management (2020, static)",
      "Soil",
      "Vegetation",
    ]);
    expect(legend.removals.map((i) => i.label)).toEqual(["Vegetation", "Soil"]);
  });

  it("names each entry's class, so the legend can describe it", () => {
    const { legend } = deriveNetFluxVariant(CATEGORY_WIDGET, "gross");
    // The roll-up's `cropland_management` field folds to the raw class.
    expect(legend.emissions.map((i) => i.classId)).toEqual([
      "livestock",
      "cropland",
      "soil",
      "vegetation",
    ]);
    expect(legend.removals.map((i) => i.classId)).toEqual([
      "vegetation",
      "soil",
    ]);
  });

  it("ignores non-series columns the backend may add to a row", () => {
    const withExtras: InsightWidget = {
      ...CATEGORY_WIDGET,
      seriesFields: [...(CATEGORY_WIDGET.seriesFields ?? []), "aoi_id"],
    };
    const variant = deriveNetFluxVariant(withExtras, "gross");
    expect(variant.seriesFields).not.toContain("aoi_id");
    expect(variant.data[0]["Net flux"]).toBe(CATEGORY_NET);
  });
});

describe("deriveNetFluxVariant — net", () => {
  it("collapses to one signed bar carrying the same total", () => {
    const variant = deriveNetFluxVariant(CATEGORY_WIDGET, "net");
    expect(variant.seriesFields).toEqual(["Net source"]);
    expect(variant.data[0]["Net source"]).toBe(CATEGORY_NET);
    expect(variant.data[0]["Net flux"]).toBe(CATEGORY_NET);
  });

  it("leaves colorMap empty so the divergent tint drives the bar", () => {
    const variant = deriveNetFluxVariant(CATEGORY_WIDGET, "net");
    expect(variant.colorMap).toEqual({});
    expect(variant.divergentColors.positive).toBeTruthy();
    expect(variant.divergentColors.negative).toBeTruthy();
  });

  it("uses a flat legend", () => {
    const { legend } = deriveNetFluxVariant(CATEGORY_WIDGET, "net");
    expect(legend.layout).toBe("flat");
    expect(legend.emissions.map((i) => i.label)).toEqual([
      "Net source (+)",
      "Net sink (−)",
    ]);
    expect(legend.removals).toEqual([]);
  });

  it("names no class on the sign entries, so they carry no info icon", () => {
    const { legend } = deriveNetFluxVariant(CATEGORY_WIDGET, "net");
    expect(legend.emissions.every((i) => i.classId === undefined)).toBe(true);
  });
});

describe("deriveNetFluxVariant — y axis", () => {
  it("pins the round-number ticks the design draws", () => {
    // The frame's 2020 column: +1600 emissions stacked, -750 removals.
    const { yTicks, yDomain } = deriveNetFluxVariant(CATEGORY_WIDGET, "gross");
    expect(yTicks).toEqual([-500, 0, 500, 1000, 1500]);
    // The domain has to hold every tick, or recharts drops the outliers.
    expect(yDomain[0]).toBeLessThanOrEqual(-500);
    expect(yDomain[1]).toBeGreaterThanOrEqual(1500);
  });

  it("measures the stack, not the largest single series", () => {
    // Six series none of which exceeds 820, but they stack to 1600.
    const { yDomain } = deriveNetFluxVariant(CATEGORY_WIDGET, "gross");
    expect(yDomain[1]).toBeGreaterThan(1600);
    expect(yDomain[0]).toBeLessThan(-750);
  });

  it("rescales to the collapsed bar under the net measure", () => {
    const { yTicks } = deriveNetFluxVariant(CATEGORY_WIDGET, "net");
    // One +850 bar, so the axis no longer needs to reach 1500.
    expect(yTicks).toEqual([0, 200, 400, 600, 800]);
  });

  it("always labels zero", () => {
    for (const measure of ["gross", "net"] as const) {
      expect(deriveNetFluxVariant(CATEGORY_WIDGET, measure).yTicks).toContain(
        0
      );
    }
  });
});

describe("deriveNetFluxVariant — resilience", () => {
  it("survives an empty payload", () => {
    const empty: InsightWidget = { ...CATEGORY_WIDGET, data: [] };
    expect(deriveNetFluxVariant(empty, "gross").data).toEqual([]);
    expect(deriveNetFluxVariant(empty, "net").data).toEqual([]);
  });

  it("treats a missing metric on a row as zero, not NaN", () => {
    const sparse: InsightWidget = {
      ...CATEGORY_WIDGET,
      data: [{ year: 2020, vegetation_emissions: 100_000_000 }],
    };
    expect(deriveNetFluxVariant(sparse, "gross").data[0]["Net flux"]).toBe(100);
  });
});

describe("netFluxTableProps", () => {
  it("groups gross-measure table columns vegetation, then soil, then agriculture", () => {
    const variant = deriveNetFluxVariant(CATEGORY_WIDGET, "gross");
    const { columnOrder } = netFluxTableProps(variant, "year", "gross");
    expect(columnOrder).toEqual([
      "year",
      "vegetation_emissions",
      "vegetation_removals",
      "soil_emissions",
      "soil_removals",
      "cropland_management_emissions",
      "livestock_emissions",
      "Net flux",
    ]);
  });

  it("hides the redundant Net source column only for the net measure", () => {
    const gross = deriveNetFluxVariant(CATEGORY_WIDGET, "gross");
    expect(netFluxTableProps(gross, "year", "gross").hiddenColumns).toEqual([]);

    const net = deriveNetFluxVariant(CATEGORY_WIDGET, "net");
    expect(netFluxTableProps(net, "year", "net").hiddenColumns).toEqual([
      "Net source",
    ]);
  });

  it("bolds the net-flux column", () => {
    const variant = deriveNetFluxVariant(CATEGORY_WIDGET, "gross");
    expect(netFluxTableProps(variant, "year", "gross").boldColumns).toEqual([
      "Net flux",
    ]);
  });
});

describe("netFluxTooltipRows", () => {
  /** What recharts hands the tooltip: one entry per drawn series, plus the line. */
  const fullDetailPayload = [
    { dataKey: "tree_loss_emissions", value: 567, color: "#543005" },
    {
      dataKey: "trees_remaining_trees_emissions",
      value: 162,
      color: "#8c510a",
    },
    {
      dataKey: "non_trees_remaining_non_trees_emissions",
      value: 81,
      color: "#bf812d",
    },
    { dataKey: "mineral_soil_emissions", value: 162, color: "#dfc27d" },
    { dataKey: "organic_soil_emissions", value: 378, color: "#ebd9b0" },
    {
      dataKey: "cropland_management_emissions",
      value: 150,
      color: HATCH_CROPLAND,
    },
    { dataKey: "livestock_emissions", value: 100, color: HATCH_LIVESTOCK },
    { dataKey: "tree_gain_removals", value: -506, color: "#01665e" },
    {
      dataKey: "trees_remaining_trees_removals",
      value: -135,
      color: "#35978f",
    },
    {
      dataKey: "non_trees_remaining_non_trees_removals",
      value: -34,
      color: "#80cdc1",
    },
    { dataKey: "mineral_soil_removals", value: -75, color: "#003c30" },
    { dataKey: "Net flux", value: 850, color: "#172b7a" },
  ];
  /** The declaration order `ChartWidget` passes — here the payload's own. */
  const fullDetailOrder = fullDetailPayload.map((e) => e.dataKey);

  const categoryOrder = [
    "vegetation_emissions",
    "soil_emissions",
    "cropland_management_emissions",
    "livestock_emissions",
    "vegetation_removals",
    "soil_removals",
    "Net flux",
  ];

  it("orders emissions top-of-stack first, then removals, as the legend does", () => {
    const { rows } = netFluxTooltipRows(fullDetailPayload, fullDetailOrder);
    expect(rows.map((r) => r.label)).toEqual([
      "Livestock (static)",
      "Cropland mgmt (static)",
      "Organic soil",
      "Mineral soil",
      "Non-tree vegetation",
      "Trees rem. trees",
      "Tree loss",
      "Tree gain",
      "Trees rem. trees",
      "Non-tree vegetation",
      "Mineral soil",
    ]);
  });

  it("gives cropland and livestock their own rows, each in its own hatch", () => {
    const { rows } = netFluxTooltipRows(fullDetailPayload, fullDetailOrder);
    expect(rows.find((r) => r.key === "cropland_management_emissions")).toEqual(
      {
        key: "cropland_management_emissions",
        label: "Cropland mgmt (static)",
        value: 150,
        color: HATCH_CROPLAND,
      }
    );
    expect(rows.find((r) => r.key === "livestock_emissions")).toEqual({
      key: "livestock_emissions",
      label: "Livestock (static)",
      value: 100,
      color: HATCH_LIVESTOCK,
    });
    expect(rows.map((r) => r.label)).not.toContain("Agriculture (static)");
  });

  it("takes the total from the line, not from the bars, and names it Net flux", () => {
    expect(
      netFluxTooltipRows(fullDetailPayload, fullDetailOrder).total
    ).toEqual({ label: "Net flux", value: 850 });
  });

  describe("net measure", () => {
    // The net measure's bar and line carry the same value, so the tooltip
    // shows it once: as the bold total, labelled and swatched by sign like the
    // legend rather than "Net flux" (that name stays on the table column).
    const netPayload = (value: number) => [
      { dataKey: "Net source", value, color: "#8c510a" },
      { dataKey: "Net flux", value, color: "#172b7a" },
    ];
    const netOrder = ["Net source", "Net flux"];

    it("shows a positive year once, as a source", () => {
      const { rows, total } = netFluxTooltipRows(netPayload(850), netOrder);
      expect(rows).toEqual([]);
      expect(total).toEqual({
        label: "Net source",
        value: 850,
        color: "#8c510a",
      });
    });

    it("shows a negative year once, as a sink", () => {
      const { rows, total } = netFluxTooltipRows(netPayload(-320), netOrder);
      expect(rows).toEqual([]);
      expect(total).toEqual({
        label: "Net sink",
        value: -320,
        color: "#01665e",
      });
    });

    it("keeps a zero year rather than showing nothing, and calls it a source", () => {
      const { rows, total } = netFluxTooltipRows(netPayload(0), netOrder);
      expect(rows).toEqual([]);
      expect(total?.label).toBe("Net source");
    });
  });

  it("lists whatever the active detail level draws", () => {
    const { rows, total } = netFluxTooltipRows(
      [
        { dataKey: "vegetation_emissions", value: 810, color: "#8c510a" },
        { dataKey: "soil_emissions", value: 540, color: "#dfc27d" },
        {
          dataKey: "cropland_management_emissions",
          value: 150,
          color: HATCH_CROPLAND,
        },
        { dataKey: "livestock_emissions", value: 100, color: HATCH_LIVESTOCK },
        { dataKey: "vegetation_removals", value: -675, color: "#01665e" },
        { dataKey: "soil_removals", value: -75, color: "#80cdc1" },
        { dataKey: "Net flux", value: 850, color: "#172b7a" },
      ],
      categoryOrder
    );
    expect(rows.map((r) => r.label)).toEqual([
      "Livestock (static)",
      "Cropland mgmt (static)",
      "Soil",
      "Vegetation",
      "Vegetation",
      "Soil",
    ]);
    expect(total).toEqual({ label: "Net flux", value: 850 });
  });

  it("omits a series that draws no segment because its value is 0", () => {
    const withZeros = fullDetailPayload.map((entry) =>
      entry.dataKey === "organic_soil_emissions" ||
      entry.dataKey === "cropland_management_emissions" ||
      entry.dataKey === "livestock_emissions"
        ? { ...entry, value: 0 }
        : entry
    );
    const { rows } = netFluxTooltipRows(withZeros, fullDetailOrder);
    const labels = rows.map((r) => r.label);
    expect(labels).not.toContain("Organic soil");
    expect(labels).not.toContain("Cropland mgmt (static)");
    expect(labels).not.toContain("Livestock (static)");
    expect(labels).toEqual([
      "Mineral soil",
      "Non-tree vegetation",
      "Trees rem. trees",
      "Tree loss",
      "Tree gain",
      "Trees rem. trees",
      "Non-tree vegetation",
      "Mineral soil",
    ]);
  });

  it("drops only the agriculture class that drew nothing, not its sibling", () => {
    const croplandOnly = fullDetailPayload.map((entry) =>
      entry.dataKey === "livestock_emissions" ? { ...entry, value: 0 } : entry
    );
    const { rows } = netFluxTooltipRows(croplandOnly, fullDetailOrder);
    expect(
      rows.find((r) => r.key === "cropland_management_emissions")?.value
    ).toBe(150);
    expect(rows.find((r) => r.key === "livestock_emissions")).toBeUndefined();
  });

  it("follows the stacking order when recharts' payload order has drifted", () => {
    // The order recharts is left with after a Full → Category switch: the two
    // agriculture bars survive the switch and keep their slots, the rest
    // register behind them, and the line re-registers last.
    const drifted = [
      {
        dataKey: "cropland_management_emissions",
        value: 150,
        color: HATCH_CROPLAND,
      },
      { dataKey: "livestock_emissions", value: 100, color: HATCH_LIVESTOCK },
      { dataKey: "soil_removals", value: -75, color: "#80cdc1" },
      { dataKey: "vegetation_removals", value: -675, color: "#01665e" },
      { dataKey: "soil_emissions", value: 540, color: "#dfc27d" },
      { dataKey: "vegetation_emissions", value: 810, color: "#8c510a" },
      { dataKey: "Net flux", value: 850, color: "#172b7a" },
    ];

    const { rows, total } = netFluxTooltipRows(drifted, categoryOrder);

    expect(rows.map((r) => r.label)).toEqual([
      "Livestock (static)",
      "Cropland mgmt (static)",
      "Soil",
      "Vegetation",
      "Vegetation",
      "Soil",
    ]);
    expect(total).toEqual({ label: "Net flux", value: 850 });
  });
});

/**
 * The acceptance rule for the three DETAIL charts: every bar segment drawn
 * has one legend entry and one tooltip row, in the same order and the same
 * swatch, so the three read as one another.
 */
describe("legend, bar segments and tooltip agree", () => {
  /**
   * What recharts hands the tooltip for a variant's first row: one entry per
   * bar drawn, carrying the fill `ChartWidget` gave it from `colorMap`, plus
   * the line.
   */
  const payloadFor = (variant: NetFluxVariant) => [
    ...variant.seriesFields.map((field) => ({
      dataKey: field,
      value: Number(variant.data[0][field]),
      color: variant.colorMap[field],
    })),
    {
      dataKey: variant.lineField,
      value: Number(variant.data[0][variant.lineField]),
    },
  ];

  /** The legend's reading order: emissions top-of-stack first, then removals. */
  const legendOrder = (variant: NetFluxVariant) => [
    ...variant.seriesFields
      .filter((f) => seriesGroup(f) === "emissions")
      .reverse(),
    ...variant.seriesFields.filter((f) => seriesGroup(f) === "removals"),
  ];

  it.each(DETAIL_LEVEL_WIDGETS)(
    "%s: one tooltip row per bar segment, in legend order",
    (_, widget) => {
      const variant = deriveNetFluxVariant(widget, "gross");
      const { rows } = netFluxTooltipRows(payloadFor(variant), [
        ...variant.seriesFields,
        variant.lineField,
      ]);
      const fields = legendOrder(variant);

      expect(rows).toHaveLength(variant.seriesFields.length);
      expect(rows.map((r) => r.key)).toEqual(fields);
      expect(rows.map((r) => r.label)).toEqual(fields.map(tooltipSeriesLabel));
    }
  );

  it.each(DETAIL_LEVEL_WIDGETS)(
    "%s: tooltip swatches match the legend's, entry for entry",
    (_, widget) => {
      const variant = deriveNetFluxVariant(widget, "gross");
      const { rows } = netFluxTooltipRows(payloadFor(variant), [
        ...variant.seriesFields,
        variant.lineField,
      ]);
      const legend = [...variant.legend.emissions, ...variant.legend.removals];

      expect(legend).toHaveLength(variant.seriesFields.length);
      expect(rows.map((r) => r.color)).toEqual(legend.map((i) => i.color));
    }
  );
});

describe("csvColumnName", () => {
  it("appends the unit suffix to an emissions/removals field", () => {
    expect(csvColumnName("cropland_management_emissions")).toBe(
      "cropland_management_emissions_MgCO2e"
    );
    expect(csvColumnName("vegetation_removals")).toBe(
      "vegetation_removals_MgCO2e"
    );
  });

  it("renames the net-flux line field without disturbing its on-screen label", () => {
    expect(csvColumnName(NET_FLUX_LINE_FIELD)).toBe("land_net_flux_MgCO2e");
    expect(NET_FLUX_LINE_FIELD).toBe("Net flux");
  });

  it("passes an unrecognized field (e.g. the x-axis) through unchanged", () => {
    expect(csvColumnName("year")).toBe("year");
  });
});

describe("netFluxCsvRows", () => {
  it("keeps the gross measure's values in Mg, unlike the Mt-scaled chart variant", () => {
    const csvRows = netFluxCsvRows(CATEGORY_WIDGET, "gross");
    expect(csvRows).toEqual([
      {
        year: 2020,
        vegetation_emissions: 530_000_000,
        soil_emissions: 820_000_000,
        cropland_management_emissions: 150_000_000,
        livestock_emissions: 100_000_000,
        vegetation_removals: -710_000_000,
        soil_removals: -40_000_000,
        [NET_FLUX_LINE_FIELD]: 850_000_000,
      },
    ]);

    const variant = deriveNetFluxVariant(CATEGORY_WIDGET, "gross");
    expect(variant.data[0][NET_FLUX_LINE_FIELD]).toBe(CATEGORY_NET);
  });

  it("keeps the net measure's total in Mg too", () => {
    const csvRows = netFluxCsvRows(CATEGORY_WIDGET, "net");
    expect(csvRows[0][NET_FLUX_LINE_FIELD]).toBe(850_000_000);
  });
});
