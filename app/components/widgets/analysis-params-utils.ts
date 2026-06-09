import { AnalysisParams } from "@/app/types/chat";
import { ParamChipColorScheme } from "@/app/components/ui/ParamChip";
import { shortDatasetName } from "@/app/constants/datasets";
import { buildYearParam } from "@/app/utils/formatYearRange";

export interface ParamChipData {
  label: string;
  value: string;
  colorScheme: ParamChipColorScheme;
  /** Full text for the hover tooltip when `value` is an abbreviation. */
  tooltip?: string;
  /** Render the value in the label colour too (AREA chips). */
  highlightValue?: boolean;
}

export function buildChips(params: AnalysisParams): ParamChipData[] {
  const chips: ParamChipData[] = [];

  // Area chips — one per AOI (value coloured like the label)
  if (params.areas?.length) {
    for (const area of params.areas) {
      chips.push({
        label: "AREA",
        value: area,
        colorScheme: "blue",
        highlightValue: true,
      });
    }
  }

  // Dataset chip — show the short label, tooltip the full dataset name
  if (params.dataset) {
    chips.push({
      label: "DATA",
      value: shortDatasetName(params.dataset),
      colorScheme: "green",
      tooltip: params.dataset,
    });
  }

  // Canopy threshold chip (only if present — omit for non-tree-cover datasets)
  if (params.canopyThreshold != null) {
    chips.push({
      label: "CANOPY",
      value: `≥ ${params.canopyThreshold}%`,
      colorScheme: "purple",
    });
  }

  // Year chip — shared with the legend so labelling/format stay identical
  const yearParam = buildYearParam(params.startYear, params.endYear);
  if (yearParam) {
    chips.push({ ...yearParam, colorScheme: "purple" });
  }

  return chips;
}
