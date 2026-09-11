"use client";
import { useRef, useState, useLayoutEffect } from "react";
import { Flex, Text } from "@chakra-ui/react";

import ChartWidget from "@/app/components/widgets/ChartWidget";
import type { InsightWidget } from "@/app/types/chat";
import { abbreviateYear, formatXAxisLabel } from "@/app/utils/formatCharts";
import { formatTick } from "@/src/shared/lib/chart-ticks";
import { signed } from "@/src/shared/lib/number-format";
import { FLUX_UNITS } from "@/src/shared/lib/units";

import { netFluxWidgetDetailLabel } from "../model/net-flux-siblings";
import {
  type NetFluxMeasure,
  type NetFluxVariant,
} from "../model/net-flux-variants";
import { NetFluxHatchDefs, NetFluxLegend } from "./NetFluxLegend";
import { NetFluxTooltip } from "./NetFluxTooltip";

const EN_DASH = "–";

interface NetFluxChartBodyProps {
  /** The widget already narrowed to the active measure. */
  widget: InsightWidget;
  variant: NetFluxVariant;
  measure: NetFluxMeasure;
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
 * the series and the units, then the direction/detail line, then the fixed
 * caption describing the series.
 */
function TimeSeriesHeader({
  variant,
  xAxis,
  measure,
  detailLabel,
}: {
  variant: NetFluxVariant;
  xAxis: string;
  measure: NetFluxMeasure;
  /** The backend's own chart title, which names the detail level. */
  detailLabel: string;
}) {
  const ends = endpoints(variant, xAxis);
  if (!ends) return null;

  const { first, last } = ends;
  // Positive net flux means the land is a net source of emissions; negative
  // means it is absorbing more than it emits (a sink).
  const direction = last.value >= 0 ? "net source" : "net sink";
  const label = measure === "net" ? "Net only" : detailLabel;
  const range =
    first.year === last.year
      ? first.year
      : `${first.year}${EN_DASH}${last.year}`;

  return (
    <Flex direction="column" gap="3px">
      <Text
        fontFamily="body"
        fontWeight="medium"
        color="#172B7A"
        fontSize="18px"
        lineHeight="normal"
      >
        Net land flux: {signed.format(first.value)}{" "}
        <Text as="span" fontSize="12px" color="#565E7B">
          ({first.year})
        </Text>{" "}
        → {signed.format(last.value)}{" "}
        <Text as="span" fontSize="12px" color="#565E7B">
          ({last.year})
        </Text>{" "}
        <Text as="span" fontSize="12px" color="#565E7B">
          {FLUX_UNITS}
        </Text>
      </Text>
      <Text fontFamily="mono" fontSize="10px" color="#656E7B">
        {direction} · {label}
      </Text>
      <Text
        fontFamily="body"
        fontSize="12px"
        fontWeight="normal"
        lineHeight="16px"
        color="#282D33"
      >
        Land use annual · {range} · Agriculture fixed 2020
      </Text>
    </Flex>
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
  measure,
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
      <TimeSeriesHeader
        variant={variant}
        xAxis={widget.xAxis}
        measure={measure}
        detailLabel={netFluxWidgetDetailLabel(widget)}
      />
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
