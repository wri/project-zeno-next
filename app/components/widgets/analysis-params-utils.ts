import type { RecordedAnalysisInputs } from "@/src/entities/insight";
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

/** AREA chips shown before the rest fold into one "+N" chip. */
export const AREA_CHIP_LIMIT = 3;

/**
 * The chips for an analysis's recorded inputs: one per distinct area,
 * dataset, canopy threshold and year range. Past `areaLimit` areas, the rest
 * fold into one "+N" chip whose tooltip names them; print passes `Infinity`,
 * since paper has no tooltip.
 */
export function buildChips(
  inputs: RecordedAnalysisInputs,
  areaLimit = AREA_CHIP_LIMIT
): ParamChipData[] {
  const areaNames = inputs.areas.map((area) => area.name);
  const folded = areaNames.slice(areaLimit);
  return [
    ...areaNames.slice(0, areaLimit).map(areaChip),
    ...(folded.length > 0
      ? [{ ...areaChip(`+${folded.length}`), tooltip: folded.join(" · ") }]
      : []),
    ...inputs.datasets.map((dataset) => datasetChip(dataset.name)),
    ...inputs.canopyCover.map(
      (value): ParamChipData => ({
        label: "CANOPY",
        value: formatCanopyThreshold(value),
        colorScheme: "purple",
      })
    ),
    // Shared with the legend so labelling and format stay identical.
    ...inputs.years.flatMap((years) => {
      const yearParam = buildYearParam(years.start, years.end);
      return yearParam
        ? [{ ...yearParam, colorScheme: "purple" as const }]
        : [];
    }),
  ];
}
