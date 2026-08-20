"use client";
import { Box, Flex, IconButton, Text } from "@chakra-ui/react";
import { CaretDownIcon, CaretRightIcon, InfoIcon } from "@phosphor-icons/react";
import {
  Bar,
  BarChart,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

import {
  singleSidedLabel,
  type FluxMeasure,
  type FluxRow,
} from "../model/hierarchy";
import {
  AXIS_HEIGHT,
  BAR_SIZE,
  EMISSIONS_COLOR,
  NET_TICK_COLOR,
  PLOT_MARGIN_X,
  REMOVALS_COLOR,
  ROW_HEIGHT,
  ZERO_LINE_COLOR,
} from "./tree-chart-constants";

/**
 * Signed, thousands-separated — the design prints every value with an explicit
 * sign so a reader never has to infer direction from colour alone.
 */
const signed = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
  signDisplay: "always",
});

interface PlotRow {
  id: string;
  avgEmissions: number | null;
  avgRemovals: number | null;
  net: number | null;
}

/** Round step at or above `raw`, from the usual 1/2/2.5/5/10 ladder. */
function niceStep(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const base = raw / magnitude;
  const nice = [1, 2, 2.5, 5, 10].find((candidate) => candidate >= base) ?? 10;
  return nice * magnitude;
}

/**
 * Ticks at round multiples of a nice step, which is what the design shows
 * (`-500 0 500`) — recharts' automatic ticks land on the padded data bounds
 * and read as noise (`-216.4 183.6 906.4`). Zero always falls on a multiple,
 * so the zero line is always labelled.
 */
function niceTicks([min, max]: [number, number]): number[] {
  const step = niceStep((max - min) / 5);
  const ticks: number[] = [];
  for (let t = Math.ceil(min / step) * step; t <= max; t += step) {
    // Snap to the step grid so float drift can't produce -0 or 499.9999.
    ticks.push(Math.round(t / step) * step);
  }
  return ticks;
}

/**
 * Bar geometry recharts hands a custom `shape`, plus the row it belongs to.
 * `x`/`width` are in pixels; with `stackOffset="sign"` a positive bar starts at
 * the zero pixel and a negative one ends there, which is what lets the shape
 * recover the scale without measuring the container.
 */
interface ShapeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: PlotRow;
  side: "emissions" | "removals";
}

/** Which bar draws the net tick — the side that actually has a value. */
function tickCarrier(row: PlotRow): "emissions" | "removals" | null {
  if (row.avgEmissions != null && row.avgEmissions !== 0) return "emissions";
  if (row.avgRemovals != null && row.avgRemovals !== 0) return "removals";
  return null;
}

/**
 * A gross bar, plus the net tick when this is the row's carrier side.
 *
 * Two recharts details drive this. First, in a sign stack `x` is the *zero*
 * pixel for both signs and `width` carries the direction — a negative bar comes
 * through with a negative width (an SVG `rect` would silently render nothing),
 * so the geometry has to be normalised before use. Second, that same signed
 * width recovers the scale (`|width| / |value|` px per unit), which is what lets
 * the tick be placed exactly without separately measuring the container.
 */
function GrossBar({ x, y, width, height, payload, side }: ShapeProps) {
  if (x == null || y == null || width == null || height == null || !payload) {
    return null;
  }

  const fill = side === "emissions" ? EMISSIONS_COLOR : REMOVALS_COLOR;
  const value =
    side === "emissions" ? payload.avgEmissions : payload.avgRemovals;
  const span = Math.abs(width);
  const hasBar = value != null && value !== 0 && span > 0;
  const left = Math.min(x, x + width);

  let tickX: number | null = null;
  if (tickCarrier(payload) === side && payload.net != null && hasBar) {
    // `x` is the zero pixel regardless of sign.
    tickX = x + payload.net * (span / Math.abs(value));
  }

  return (
    <g>
      {hasBar && (
        <rect x={left} y={y} width={span} height={height} fill={fill} />
      )}
      {tickX != null && (
        <rect
          x={tickX - 1.5}
          y={y - 3}
          width={3}
          height={height + 6}
          fill={NET_TICK_COLOR}
        />
      )}
    </g>
  );
}

function TreeLabel({
  row,
  onToggle,
}: {
  row: FluxRow;
  onToggle: (nodeId: string) => void;
}) {
  const isRoot = row.depth === 0;
  const Caret = row.expanded ? CaretDownIcon : CaretRightIcon;
  // The root is always open in the design — it carries an info icon, not a
  // caret — so only descendants get a disclosure control.
  const showCaret = row.hasChildren && !isRoot;

  return (
    <Flex
      h={`${ROW_HEIGHT}px`}
      align="center"
      gap="4px"
      pl={`${row.depth * 16}px`}
      pr="8px"
      flexShrink={0}
    >
      {showCaret ? (
        <IconButton
          size="2xs"
          variant="plain"
          h="16px"
          minW="16px"
          w="16px"
          p={0}
          bg="transparent"
          color="#656E7B"
          flexShrink={0}
          _hover={{ color: "#172B7A" }}
          onClick={() => onToggle(row.node.id)}
          aria-expanded={row.expanded}
          aria-label={`${row.expanded ? "Collapse" : "Expand"} ${row.node.label}`}
        >
          <Caret size={12} weight="fill" />
        </IconButton>
      ) : (
        <Box w="12px" flexShrink={0} />
      )}
      <Text
        fontFamily="body"
        fontSize={isRoot ? "15px" : "13px"}
        fontWeight={isRoot || row.hasChildren ? "medium" : "normal"}
        color={isRoot ? "#172B7A" : "#282D33"}
        lineHeight="1.25"
      >
        {row.node.label}
      </Text>
      {isRoot && (
        <Box color="#656E7B" lineHeight={0} flexShrink={0}>
          <InfoIcon size={13} />
        </Box>
      )}
    </Flex>
  );
}

function ValueCell({ row, measure }: { row: FluxRow; measure: FluxMeasure }) {
  const single = singleSidedLabel(row.node);
  const showPair =
    measure === "gross" &&
    !single &&
    (row.node.avgEmissions != null || row.node.avgRemovals != null);

  return (
    <Flex
      h={`${ROW_HEIGHT}px`}
      direction="column"
      align="flex-end"
      justify="center"
      pl="12px"
      flexShrink={0}
    >
      <Text
        fontFamily="body"
        fontSize="14px"
        fontWeight="medium"
        color="#172B7A"
        css={{ fontVariantNumeric: "tabular-nums" }}
      >
        {row.net == null ? "—" : signed.format(row.net)}
      </Text>
      {measure === "gross" && (
        <Text
          fontFamily="mono"
          fontSize="10px"
          color="#565E7B"
          whiteSpace="nowrap"
          css={{ fontVariantNumeric: "tabular-nums" }}
        >
          {showPair
            ? `${signed.format(row.node.avgRemovals ?? 0)}/${signed.format(
                row.node.avgEmissions ?? 0
              )}`
            : (single ?? "")}
        </Text>
      )}
    </Flex>
  );
}

interface GhgFluxTreeChartProps {
  rows: FluxRow[];
  measure: FluxMeasure;
  onToggle: (nodeId: string) => void;
}

/**
 * The design's hierarchical diverging bar chart: an indented collapsible tree,
 * a shared value scale with its axis on top, and a right-hand value column.
 *
 * Recharts owns the bar geometry, scale and axis; the tree and value columns are
 * HTML because they need multi-line wrapping, click targets and a two-line
 * value — none of which belong in an SVG tick. Alignment is exact rather than
 * eyeballed: the chart is `AXIS_HEIGHT + rows * ROW_HEIGHT` tall with zero
 * vertical margin, so each category band is exactly `ROW_HEIGHT` and lines up
 * with the HTML row at the same index.
 */
export function GhgFluxTreeChart({
  rows,
  measure,
  onToggle,
}: GhgFluxTreeChartProps) {
  const plotRows: PlotRow[] = rows.map((row) => ({
    id: row.node.id,
    avgEmissions: row.node.avgEmissions,
    avgRemovals: row.node.avgRemovals,
    net: row.net,
  }));

  // Domain from whichever values the active measure actually draws, padded so a
  // full-length bar doesn't touch the plot edge.
  const drawn =
    measure === "net"
      ? plotRows.map((r) => r.net ?? 0)
      : plotRows.flatMap((r) => [r.avgEmissions ?? 0, r.avgRemovals ?? 0]);
  const rawMax = Math.max(0, ...drawn);
  const rawMin = Math.min(0, ...drawn);
  const pad = Math.max(rawMax - rawMin, 1) * 0.04;
  const domain: [number, number] = [rawMin - pad, rawMax + pad];
  const ticks = niceTicks(domain);
  const zeroFraction = (0 - domain[0]) / (domain[1] - domain[0]);

  const height = AXIS_HEIGHT + rows.length * ROW_HEIGHT;

  return (
    <Flex align="flex-start" w="full">
      {/* Tree column */}
      <Flex direction="column" flexShrink={0}>
        <Box h={`${AXIS_HEIGHT}px`} />
        {rows.map((row) => (
          <TreeLabel key={row.node.id} row={row} onToggle={onToggle} />
        ))}
      </Flex>

      {/* Plot column */}
      <Box flex="1" minW="80px" position="relative">
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={plotRows}
            layout="vertical"
            stackOffset="sign"
            margin={{
              top: 0,
              right: PLOT_MARGIN_X,
              bottom: 0,
              left: PLOT_MARGIN_X,
            }}
          >
            <XAxis
              type="number"
              orientation="top"
              domain={domain}
              ticks={ticks}
              // Without this recharts' default interval quietly drops ticks it
              // thinks would crowd, losing the negative end of the scale.
              interval={0}
              height={AXIS_HEIGHT}
              tickLine={false}
              axisLine={{ stroke: "#E7EBF5" }}
              tick={{ fontSize: 10, fill: "#9AA0AB" }}
            />
            <YAxis type="category" dataKey="id" hide />
            <ReferenceLine x={0} stroke={ZERO_LINE_COLOR} strokeWidth={1} />
            {measure === "net" ? (
              <Bar dataKey="net" barSize={BAR_SIZE} isAnimationActive={false}>
                {plotRows.map((row) => (
                  <Cell
                    key={row.id}
                    fill={(row.net ?? 0) < 0 ? REMOVALS_COLOR : EMISSIONS_COLOR}
                  />
                ))}
              </Bar>
            ) : (
              <>
                <Bar
                  dataKey="avgRemovals"
                  stackId="flux"
                  barSize={BAR_SIZE}
                  isAnimationActive={false}
                  shape={<GrossBar side="removals" />}
                />
                <Bar
                  dataKey="avgEmissions"
                  stackId="flux"
                  barSize={BAR_SIZE}
                  isAnimationActive={false}
                  shape={<GrossBar side="emissions" />}
                />
              </>
            )}
          </BarChart>
        </ResponsiveContainer>

        {/* `n/a` markers sit on the empty side of zero for single-sided rows.
            Positioned off the same domain the axis uses, so they track it. */}
        {measure === "gross" &&
          rows.map((row, index) => {
            const single = singleSidedLabel(row.node);
            if (!single) return null;
            const onRight = single === "removals only";
            return (
              <Text
                key={row.node.id}
                position="absolute"
                top={`${AXIS_HEIGHT + index * ROW_HEIGHT}px`}
                h={`${ROW_HEIGHT}px`}
                left={`calc(${PLOT_MARGIN_X}px + ${zeroFraction} * (100% - ${
                  PLOT_MARGIN_X * 2
                }px))`}
                transform={
                  onRight
                    ? "translateX(6px)"
                    : "translateX(-6px) translateX(-100%)"
                }
                display="flex"
                alignItems="center"
                fontFamily="mono"
                fontSize="9px"
                color="#9AA0AB"
                pointerEvents="none"
              >
                n/a
              </Text>
            );
          })}
      </Box>

      {/* Value column */}
      <Flex direction="column" flexShrink={0}>
        <Flex
          h={`${AXIS_HEIGHT}px`}
          align="center"
          justify="flex-end"
          pl="12px"
        >
          <Text
            fontFamily="mono"
            fontSize="10px"
            color="#9AA0AB"
            whiteSpace="nowrap"
          >
            Mt CO₂e/yr
          </Text>
        </Flex>
        {rows.map((row) => (
          <ValueCell key={row.node.id} row={row} measure={measure} />
        ))}
      </Flex>
    </Flex>
  );
}
