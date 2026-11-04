import { CONTEXT_LAYER_METADATA } from "@/app/constants/datasets";
import type { DatasetLegendConfig } from "@/app/constants/datasets";

export interface LegendClass {
  label: string;
  color: string;
}

/**
 * A dataset legend's symbology, parsed once. `symbol` and `categorical` both
 * list classes but the explorer draws them differently, so they stay apart.
 */
export type LegendSymbology =
  | { kind: "symbol" | "categorical"; classes: LegendClass[]; unit: string }
  | {
      kind: "sequential" | "divergent";
      colors: string[];
      minLabel: string;
      maxLabel: string;
      unit: string;
    };

/** Reads a legend config's symbology. `unit` is "" when the dataset has none. */
export function legendSymbology(legend: DatasetLegendConfig): LegendSymbology {
  const { type, items = [], color } = legend;
  const unit = legend.unit ?? "";

  if (type === "sequential" || type === "divergent") {
    return {
      kind: type,
      colors: items.length > 0 ? items.map((i) => i.color) : [color],
      minLabel: items[0]?.label ?? "",
      maxLabel: items[items.length - 1]?.label ?? "",
      unit,
    };
  }
  return {
    kind: type,
    classes: items.map((i) => ({ label: i.label ?? "", color: i.color })),
    unit,
  };
}
