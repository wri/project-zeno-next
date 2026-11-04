import { describe, expect, it } from "vitest";

import { legendSymbology } from "@/app/components/legend/legendModel";
import type { DatasetLegendConfig } from "@/app/constants/datasets";

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
