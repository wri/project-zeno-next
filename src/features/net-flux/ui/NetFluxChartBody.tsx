"use client";
import { useRef, useState, useLayoutEffect } from "react";
import { Flex, Text } from "@chakra-ui/react";

import ChartWidget from "@/app/components/widgets/ChartWidget";
import type { InsightWidget } from "@/app/types/chat";
import { abbreviateYear, formatXAxisLabel } from "@/app/utils/formatCharts";
import { formatTick } from "@/src/shared/lib/chart-ticks";
import { signed } from "@/src/shared/lib/number-format";
import { FLUX_UNITS } from "@/src/shared/lib/units";

import {
  NET_FLUX_LINE_FIELD,
  type NetFluxVariant,
} from "../model/net-flux-variants";
import { NetFluxHatchDefs, NetFluxLegend } from "./NetFluxLegend";
import { NetFluxTooltip } from "./NetFluxTooltip";

/**
 * Named after the line series so the axis title, the table column and the
 * tooltip's total all read as the same quantity.
 */
const Y_AXIS_LABEL = `${NET_FLUX_LINE_FIELD} (${FLUX_UNITS})`;

interface NetFluxChartBodyProps {
  /** The widget already narrowed to the active measure. */
  widget: InsightWidget;
  variant: NetFluxVariant;
  expanded?: boolean;
  fitYAxis?: boolean;
  fullWidth?: boolean;
}

interface Endpoint {
  year: string;
  value: number;
}

function endpoints(
  variant: NetFluxVariant,
  xAxis: string
): { first: Endpoint; last: Endpoint } | null {
  const rows = variant.data;
  if (rows.length === 0) return null;
  const read = (row: Record<string, unknown>): Endpoint => ({
    year: String(row[xAxis]),
    value: Number(row[variant.lineField]) || 0,
  });
  return { first: read(rows[0]), last: read(rows[rows.length - 1]) };
}

/**
 * The design's chart header: the named metric with its value at each end of
 * the series, followed by the unit.
 */
function TimeSeriesHeader({
  variant,
  xAxis,
}: {
  variant: NetFluxVariant;
  xAxis: string;
}) {
  const ends = endpoints(variant, xAxis);
  if (!ends) return null;

  const { first, last } = ends;
  const { negative, positive } = variant.divergentColors;
  const tint = (value: number) => (value < 0 ? negative : positive);
  return (
    <Text
      fontFamily="body"
      fontWeight="normal"
      color="#172B7A"
      fontSize="15px"
      lineHeight="normal"
    >
      Net land flux:{" "}
      <Text as="span" color={tint(first.value)}>
        {signed.format(first.value)}
      </Text>{" "}
      <Text as="span" fontSize="12px" color="#565E7B">
        ({first.year})
      </Text>{" "}
      →{" "}
      <Text as="span" color={tint(last.value)}>
        {signed.format(last.value)}
      </Text>{" "}
      <Text as="span" fontSize="12px" color="#565E7B">
        ({last.year})
      </Text>{" "}
      <Text as="span" fontSize="14px" color="#565E7B">
        {FLUX_UNITS}
      </Text>
    </Text>
  );
}

// ponytail: no design spec gives an exact breakpoint for the 20XX→'XX switch,
// just "when the container width reduces beyond a point" — 450px is picked as
// the point below which the default in-card width (~388-420px) falls but the
// fullscreen/dashboard-fullWidth views don't. Revisit against the real design
// once it specifies one.
const NARROW_X_AXIS_WIDTH = 450;

/**
 * Net-flux chart body — the design's own composition of a stat header, the
 * stacked/line plot, and a grouped Emissions/Removals legend. Swapped in by
 * `WidgetMessage` for this chart type in place of a bare `ChartWidget`; the
 * chart's built-in legend is suppressed in favour of the grouped one.
 */
export function NetFluxChartBody({
  widget,
  variant,
  expanded,
  fitYAxis,
  fullWidth,
}: NetFluxChartBodyProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isNarrow, setIsNarrow] = useState(false);

  useLayoutEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      setIsNarrow(entry.contentRect.width < NARROW_X_AXIS_WIDTH);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Flex direction="column" gap="16px" w="full">
      <NetFluxHatchDefs />
      <TimeSeriesHeader variant={variant} xAxis={widget.xAxis} />
      <div ref={containerRef}>
        <ChartWidget
          widget={widget}
          showLegend={false}
          expanded={expanded}
          fitYAxis={fitYAxis}
          fullWidth={fullWidth}
          yTicks={variant.yTicks}
          yDomain={variant.yDomain}
          yTickFormatter={formatTick}
          yAxisLabel={Y_AXIS_LABEL}
          tooltipContent={NetFluxTooltip}
          xTickFormatter={
            isNarrow
              ? (value, key) =>
                  key?.toString().toLowerCase() === "year"
                    ? abbreviateYear(value)
                    : String(formatXAxisLabel(value, key))
              : undefined
          }
        />
      </div>
      <NetFluxLegend legend={variant.legend} />
    </Flex>
  );
}
