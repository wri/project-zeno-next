import {
  NET_FLUX_TOTAL_LABEL,
  type FluxTooltipModel,
  type FluxTooltipRow,
} from "@/src/shared/lib/flux-tooltip";

import type { FluxMeasure, FluxRow } from "./hierarchy";
import { EMISSIONS_COLOR, REMOVALS_COLOR } from "./palette";

/**
 * Tooltip lines for one hovered tree row. The gross measure breaks the node
 * into its two bars — Emissions and Removals, swatched as the bars are drawn
 * — and closes on the net figure; a side the node structurally lacks (see
 * `singleSidedLabel`) gets no line. The net measure draws one bar, so it
 * reduces to the net line alone. Class-level detail is the chart's own rows,
 * so the tooltip does not repeat it.
 */
export function fluxTreeTooltipModel(
  row: FluxRow,
  measure: FluxMeasure
): FluxTooltipModel {
  const { avgEmissions, avgRemovals } = row.node;
  const rows: FluxTooltipRow[] = [];

  if (measure === "gross") {
    if (avgEmissions != null) {
      rows.push({
        key: "emissions",
        label: "Emissions",
        value: avgEmissions,
        color: EMISSIONS_COLOR,
      });
    }
    if (avgRemovals != null) {
      rows.push({
        key: "removals",
        label: "Removals",
        value: avgRemovals,
        color: REMOVALS_COLOR,
      });
    }
  }

  return {
    rows,
    total:
      row.net == null ? null : { label: NET_FLUX_TOTAL_LABEL, value: row.net },
  };
}
