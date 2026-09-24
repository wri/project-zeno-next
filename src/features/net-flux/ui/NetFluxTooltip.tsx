"use client";
import { FluxTooltip } from "@/src/shared/ui/FluxTooltip";

import {
  netFluxTooltipRows,
  type NetFluxTooltipEntry,
} from "../model/net-flux-variants";

interface NetFluxTooltipProps {
  active?: boolean;
  payload?: NetFluxTooltipEntry[];
  /** The hovered x value — the year, which the design uses as the heading. */
  label?: string | number;
  /** The stacking order, supplied by `ChartWidget`; see `netFluxTooltipRows`. */
  seriesOrder: readonly string[];
}

/**
 * Hover tooltip for the net-flux time series: the year, every series the
 * active Measure/Detail actually draws, then the net total (see
 * `netFluxTooltipRows` for the rules). Rendered through the shared
 * `FluxTooltip` panel so it matches the annual-average tree's tooltip.
 *
 * It replaces `ChartWidget`'s generic `Chart.Tooltip` (wired through its
 * `tooltipContent` prop) for two reasons: that one can't render the hatched
 * agriculture swatches, and it prints a unit on every line, which is what made
 * it outgrow the plot at Full detail.
 */
export function NetFluxTooltip({
  active,
  payload,
  label,
  seriesOrder,
}: NetFluxTooltipProps) {
  if (!active || !payload?.length) return null;

  const { rows, total } = netFluxTooltipRows(payload, seriesOrder);
  return <FluxTooltip title={label} rows={rows} total={total} />;
}
