import { AnalysisParams } from "@/app/types/chat";
import { ParamChipColorScheme } from "@/app/components/ui/ParamChip";
import { shortDatasetName } from "@/app/constants/datasets";
import { buildYearParam } from "@/app/utils/formatYearRange";
import { formatCanopyThreshold } from "@/app/utils/formatCanopyThreshold";

export interface ParamChipData {
  label: string;
  value: string;
  colorScheme: ParamChipColorScheme;
  /** Full text for the hover tooltip when `value` is an abbreviation. */
  tooltip?: string;
  /** Render the value in the label colour too (AREA chips). */
  highlightValue?: boolean;
}

/** An AREA chip, its value coloured like the label. */
export function areaChip(name: string): ParamChipData {
  return {
    label: "AREA",
    value: name,
    colorScheme: "blue",
    highlightValue: true,
  };
}

/** A DATA chip: the short label, with the full dataset name as tooltip. */
export function datasetChip(name: string): ParamChipData {
  return {
    label: "DATA",
    value: shortDatasetName(name),
    colorScheme: "green",
    tooltip: name,
  };
}

export function buildChips(params: AnalysisParams): ParamChipData[] {
  const chips: ParamChipData[] = [];

  // Area chips — one per AOI
  for (const area of params.areas ?? []) chips.push(areaChip(area));

  if (params.dataset) chips.push(datasetChip(params.dataset));

  // Canopy threshold chip (only if present — omit for non-tree-cover datasets)
  if (params.canopyThreshold != null) {
    chips.push({
      label: "CANOPY",
      value: formatCanopyThreshold(params.canopyThreshold),
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
