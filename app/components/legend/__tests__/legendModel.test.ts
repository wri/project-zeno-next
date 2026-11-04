import { describe, expect, it } from "vitest";

import {
  contextLegendFor,
  legendSymbology,
} from "@/app/components/legend/legendModel";
import {
  CONTEXT_LAYER_METADATA,
  type DatasetLegendConfig,
} from "@/app/constants/datasets";

const legend = (
  overrides: Partial<DatasetLegendConfig>
): DatasetLegendConfig => ({
  title: "Layer",
  color: "#000000",
  type: "symbol",
  info: "",
  note: "",
  items: [
    { color: "#111111", label: "Low" },
    { color: "#222222", label: "Mid" },
    { color: "#333333", label: "High" },
  ],
  ...overrides,
});

describe("legendSymbology", () => {
  it("reads a symbol legend as classes and keeps its unit", () => {
    expect(legendSymbology(legend({ type: "symbol", unit: "ha" }))).toEqual({
      kind: "symbol",
      classes: [
        { label: "Low", color: "#111111" },
        { label: "Mid", color: "#222222" },
        { label: "High", color: "#333333" },
      ],
      unit: "ha",
    });
  });

  it("keeps a categorical legend apart from a symbol one", () => {
    const s = legendSymbology(legend({ type: "categorical", unit: null }));
    expect(s).toMatchObject({ kind: "categorical", unit: "" });
  });

  it("reads a divergent legend as a scale between its end labels", () => {
    expect(
      legendSymbology(legend({ type: "divergent", unit: "t/ha" }))
    ).toEqual({
      kind: "divergent",
      colors: ["#111111", "#222222", "#333333"],
      minLabel: "Low",
      maxLabel: "High",
      unit: "t/ha",
    });
  });
});

describe("contextLegendFor", () => {
  it("takes the title, first item colour and info from the metadata", () => {
    const legend = CONTEXT_LAYER_METADATA.primary_forest.legend;
    expect(contextLegendFor("primary_forest")).toEqual({
      title: "Primary Forests (2001)",
      color: legend?.items?.[0]?.color,
      info: legend?.info,
    });
  });

  it("falls back to the name and a grey swatch for an unknown layer", () => {
    expect(contextLegendFor("mystery")).toEqual({
      title: "mystery",
      color: "#888",
      info: undefined,
    });
  });
});
