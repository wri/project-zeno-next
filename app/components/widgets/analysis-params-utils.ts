import { AnalysisParams } from "@/app/types/chat";
import { ParamChipColorScheme } from "@/app/components/ui/ParamChip";

export interface ParamChipData {
  label: string;
  value: string;
  colorScheme: ParamChipColorScheme;
}

export function buildChips(params: AnalysisParams): ParamChipData[] {
  const chips: ParamChipData[] = [];

  // Area chips — one per AOI
  if (params.areas?.length) {
    for (const area of params.areas) {
      chips.push({ label: "AREA", value: area, colorScheme: "blue" });
    }
  }

  // Dataset chip
  if (params.dataset) {
    chips.push({ label: "DATA", value: params.dataset, colorScheme: "green" });
  }

  // Canopy threshold chip (only if present — omit for non-tree-cover datasets)
  if (params.canopyThreshold != null) {
    chips.push({
      label: "CANOPY",
      value: `≥ ${params.canopyThreshold}%`,
      colorScheme: "purple",
    });
  }

  // Year range chip
  if (params.startYear != null && params.endYear != null) {
    chips.push({
      label: "YEARS",
      value: `${params.startYear}–${params.endYear}`,
      colorScheme: "purple",
    });
  }

  return chips;
}
