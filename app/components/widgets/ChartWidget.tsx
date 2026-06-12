import { useMemo } from "react";
import { Chart, useChart } from "@chakra-ui/charts";
import { Box, Flex, Heading, Text } from "@chakra-ui/react";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  CartesianGrid,
  Label,
  Legend,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
  usePlotArea,
} from "recharts";
import formatChartData, {
  formatYAxisLabel,
  formatXAxisLabel,
  formatTooltipValue,
  toAxisLabel,
} from "@/app/utils/formatCharts";
import { InsightWidget } from "@/app/types/chat";
import { STROKE_DASH_PATTERNS } from "@/app/utils/ChartColors";
import usePrefersReducedMotion from "@/app/hooks/usePrefersReducedMotion";

type ChartType =
  | "bar"
  | "stacked-bar"
  | "grouped-bar"
  | "line"
  | "area"
  | "pie"
  | "scatter";

const TICK_FONT_PX = 11;
const CHAR_PX = 6.5; // empirical sans-serif glyph width at 11px
const TICK_MARGIN = 6; // gap between tick text and axis line
const TITLE_BAND = 22; // reserved column: title (~14px) + breathing room
const TICK_ANGLE_RAD = (35 * Math.PI) / 180;
const MAX_X_TICKS = 12; // density target before we thin tick labels
const ANIMATION_MS = 650; // entry animation; disabled under reduced motion
const MAX_LINE_DOTS = 14; // beyond this, per-point dots become noise

// Chart wrapper components
type ChartWrapperComponent =
  | typeof BarChart
  | typeof AreaChart
  | typeof LineChart
  | typeof PieChart
  | typeof ScatterChart;

const chartWrappers: Record<ChartType, ChartWrapperComponent> = {
  bar: BarChart,
  "stacked-bar": BarChart,
  "grouped-bar": BarChart,
  line: LineChart,
  area: AreaChart,
  pie: PieChart,
  scatter: ScatterChart,
};

interface ChartWidgetProps {
  widget: InsightWidget;
  expanded?: boolean;
  /**
   * Rescale the y-axis to the data range instead of anchoring at zero.
   * Useful for flat series; offered only for line/area/scatter — truncated
   * axes misrepresent bar charts, whose lengths encode magnitude.
   */
  fitYAxis?: boolean;
}

/** Chart types where a fit-to-data y-axis is honest and useful. */
export const AXIS_FIT_TYPES: ReadonlySet<string> = new Set([
  "line",
  "area",
  "scatter",
]);

/**
 * Floor the y-domain to a round number just below the data minimum, so a
 * fitted axis starts at e.g. 35,000 rather than 35,612. Explicit numbers are
 * needed because recharts' "auto" minimum stays pinned to the 0 baseline
 * that Area items feed into the domain.
 */
function niceFloor(min: number, max: number): number {
  if (!Number.isFinite(min) || min <= 0) return min;
  const range = max - min || Math.abs(min) || 1;
  const step = Math.pow(10, Math.floor(Math.log10(range)));
  return Math.floor(min / step) * step;
}
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
    payload: { [key: string]: string | number };
  }>;
}

const CustomScatterTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length >= 2) {
    const dataPoint = payload[0].payload;
    const axisPayloads = [payload[0], payload[1]];

    return (
      <Box
        bg="bg.panel"
        p={2}
        py={1}
        borderRadius="md"
        boxShadow="md"
        border="1px"
        borderColor="border"
      >
        {dataPoint.name && (
          <Heading size="xs" mb={1}>
            {String(dataPoint.name)}
          </Heading>
        )}
        {axisPayloads.map((axisPayload, idx) => (
          <Flex
            key={idx}
            justifyContent="space-between"
            fontSize="xs"
            fontWeight="normal"
            color="fg.muted"
          >
            <Text as="span" mr={4}>
              {toAxisLabel(axisPayload.name)}
            </Text>
            <Text fontFamily="mono" textAlign="right">
              {formatTooltipValue(axisPayload.value, axisPayload.name)}
            </Text>
          </Flex>
        ))}
      </Box>
    );
  }

  return null;
};

interface CustomPieLegendProps {
  series: { name?: string | number; color?: string }[];
  /** Share of total per slice name, formatted (e.g. "26%"). */
  shares?: Map<string, string>;
}

const CustomPieLegend = ({ series, shares }: CustomPieLegendProps) => {
  if (!series) return null;

  return (
    <Flex direction="column" gap={1} as="ul" listStyleType="none" m={0} p={0}>
      {series
        .filter((entry) => entry.name && entry.color)
        .map((entry, index) => {
          const share = shares?.get(String(entry.name));
          return (
            <Flex as="li" key={`item-${index}`} align="center" gap={1.5}>
              <Box
                w={2.5}
                h={2.5}
                bg={entry.color}
                border="1px solid"
                borderColor="neutral.400"
                rounded="sm"
                flexShrink={0}
              />
              <Text
                fontSize="2xs"
                color="neutral.500"
                overflow="hidden"
                textOverflow="ellipsis"
                whiteSpace="nowrap"
                flex="1"
              >
                {String(entry.name)}
              </Text>
              {share && (
                <Text
                  fontSize="2xs"
                  color="fg.muted"
                  fontFamily="mono"
                  flexShrink={0}
                  css={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {share}
                </Text>
              )}
            </Flex>
          );
        })}
    </Flex>
  );
};

/** "26%" for most slices, "<1%" for slivers — keeps the legend scannable. */
function formatShare(value: number, total: number): string | undefined {
  if (!total || total <= 0 || !Number.isFinite(value)) return undefined;
  const pct = (value / total) * 100;
  if (pct > 0 && pct < 1) return "<1%";
  return `${Math.round(pct)}%`;
}

/**
 * Donut centre total. Rendered as a <Pie> child so it sits in the chart's
 * SVG; reads the plot area from recharts context because the pie (default
 * cx/cy of 50%) is centred there. Recharts 3 doesn't hand <Label content>
 * renderers a viewBox, so a context-reading component is the reliable path.
 */
function DonutCenterLabel({
  total,
  axisKey,
  expanded = false,
}: {
  total: number;
  axisKey?: string;
  expanded?: boolean;
}) {
  const plotArea = usePlotArea();
  if (!plotArea || total <= 0) return null;
  const cx = plotArea.x + plotArea.width / 2;
  const cy = plotArea.y + plotArea.height / 2;
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
      <tspan
        x={cx}
        dy="-0.3em"
        fontSize={expanded ? "22" : "14"}
        fontWeight="600"
        fill="var(--chakra-colors-fg)"
      >
        {formatYAxisLabel(total, axisKey)}
      </tspan>
      <tspan
        x={cx}
        dy="1.5em"
        fontSize={expanded ? "12" : "9"}
        letterSpacing="0.05em"
        fill="var(--chakra-colors-fg-muted)"
      >
        TOTAL
      </tspan>
    </text>
  );
}

interface CustomPieTooltipWithTotalProps extends CustomTooltipProps {
  total?: number;
}

const CustomPieTooltip = ({
  active,
  payload,
  total,
}: CustomPieTooltipWithTotalProps) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0];
    const value = Number(dataPoint.value);
    const pct = total && total > 0 ? ((value / total) * 100).toFixed(1) : null;
    return (
      <Box bg="bg.panel" p={2} py={1} borderRadius="sm" boxShadow="sm">
        <Flex
          fontSize="xs"
          fontWeight="normal"
          alignItems="center"
          color="fg.muted"
          gap={1}
        >
          <Box
            h={2}
            w={2}
            rounded="full"
            bg={dataPoint.payload.color}
            boxShadow="inset"
          />
          <Text as="span" mr={4}>
            {dataPoint.name}
          </Text>
          <Text fontFamily="mono" textAlign="right">
            {formatTooltipValue(value)}
            {pct !== null && (
              <Text as="span" color="fg.subtle" ml={1}>
                ({pct}%)
              </Text>
            )}
          </Text>
        </Flex>
      </Box>
    );
  }
  return null;
};

function ChartFallback({ message }: { message: string }) {
  return (
    <Flex
      align="center"
      justify="center"
      minH="120px"
      border="1px dashed"
      borderColor="border"
      borderRadius="md"
      p={4}
    >
      <Text fontSize="sm" color="fg.muted">
        {message}
      </Text>
    </Flex>
  );
}

export default function ChartWidget({
  widget,
  expanded = false,
  fitYAxis = false,
}: ChartWidgetProps) {
  const { data, xAxis, yAxis, type, seriesFields } = widget;
  const ChartTypeWrapper = chartWrappers[type as ChartType];

  const { data: formattedData, series } = useMemo(
    () =>
      xAxis
        ? formatChartData(
            data,
            type,
            xAxis,
            yAxis,
            widget.datasetName,
            seriesFields
          )
        : { data: [], series: [] },
    [data, type, xAxis, yAxis, widget.datasetName, seriesFields]
  );

  // Humanize series labels that are raw column keys (snake_case or the
  // y-axis key) — tooltip and legend then show "Tree cover loss (ha)"
  // instead of "tree_cover_loss_ha". Category-valued series names like
  // "DR Congo" are left untouched. dataKeys still use the raw `name`.
  const labelledSeries = useMemo(
    () =>
      series.map((s) =>
        s.name === yAxis || s.name.includes("_")
          ? { ...s, label: toAxisLabel(s.name) }
          : s
      ),
    [series, yAxis]
  );

  const chart = useChart({ data: formattedData, series: labelledSeries });
  const prefersReducedMotion = usePrefersReducedMotion();
  const animate = !prefersReducedMotion;

  const pieTotal = useMemo(() => {
    if (type !== "pie" || !yAxis) return 0;
    return formattedData.reduce((sum, d) => sum + (Number(d[yAxis]) || 0), 0);
  }, [type, yAxis, formattedData]);

  const pieShares = useMemo(() => {
    if (type !== "pie" || !yAxis || !xAxis || pieTotal <= 0) return undefined;
    const shares = new Map<string, string>();
    for (const row of formattedData) {
      const share = formatShare(Number(row[yAxis]), pieTotal);
      if (share) shares.set(String(row[xAxis]), share);
    }
    return shares;
  }, [type, xAxis, yAxis, formattedData, pieTotal]);

  if (!xAxis || (type === "scatter" && !yAxis)) {
    return <ChartFallback message="Chart is missing axis configuration." />;
  }

  if (!ChartTypeWrapper || formattedData.length === 0 || series.length === 0) {
    return (
      <ChartFallback
        message={
          !ChartTypeWrapper
            ? `Unsupported chart type: "${type}"`
            : "No data available for this chart."
        }
      />
    );
  }

  // Determine if the x-axis has long categorical labels that need angling
  const isNumericXAxis =
    type === "scatter" ||
    xAxis?.toLowerCase() === "year" ||
    (formattedData.length > 0 && typeof formattedData[0][xAxis] === "number");
  const needsAngledTicks =
    (!isNumericXAxis && formattedData.length > 4) ||
    (isNumericXAxis && formattedData.length > 10);

  // preserveStartEnd silently drops a mid-axis tick when (N-1) doesn't
  // divide evenly; build explicit ticks so the last data point is labeled.
  let xTicks: (string | number)[] | undefined;
  if (isNumericXAxis && type !== "scatter" && formattedData.length > 10) {
    const step = Math.ceil((formattedData.length - 1) / MAX_X_TICKS);
    xTicks = [];
    for (let i = 0; i < formattedData.length; i += step) {
      xTicks.push(formattedData[i][xAxis] as string | number);
    }
    const last = formattedData[formattedData.length - 1][xAxis] as
      | string
      | number;
    if (xTicks[xTicks.length - 1] !== last) xTicks.push(last);
  }

  // Sized from the longest formatted tick so titles hug the ticks regardless
  // of content — fixed sizes leave dead bands or cause overlap. The same pass
  // detects negative values (e.g. GHG net-flux sinks) so the Y domain can
  // extend below zero instead of clipping those bars.
  const yKeys = type === "scatter" ? [yAxis] : series.map((s) => s.name);
  let longestXTickChars = 0;
  let longestYTickChars = 0;
  let hasNegativeValues = false;
  let dataMinValue = Infinity;
  let dataMaxValue = -Infinity;
  for (const row of formattedData) {
    const xFormatted =
      type === "scatter"
        ? formatYAxisLabel(Number(row[xAxis]), xAxis)
        : formatXAxisLabel(row[xAxis] as string | number, xAxis);
    longestXTickChars = Math.max(longestXTickChars, String(xFormatted).length);

    for (const k of yKeys) {
      const v = Number(row[k]);
      if (!Number.isFinite(v)) continue;
      if (v < 0) hasNegativeValues = true;
      dataMinValue = Math.min(dataMinValue, v);
      dataMaxValue = Math.max(dataMaxValue, v);
      longestYTickChars = Math.max(
        longestYTickChars,
        formatYAxisLabel(v, yAxis).length
      );
    }
  }

  const xAxisHeight = needsAngledTicks
    ? Math.ceil(
        TICK_MARGIN +
          longestXTickChars * CHAR_PX * Math.sin(TICK_ANGLE_RAD) +
          TICK_FONT_PX * Math.cos(TICK_ANGLE_RAD) +
          TITLE_BAND
      )
    : TICK_MARGIN + TICK_FONT_PX + TITLE_BAND;

  const yAxisWidth = Math.ceil(
    longestYTickChars * CHAR_PX + TICK_MARGIN + TITLE_BAND
  );

  const animationProps = {
    isAnimationActive: animate,
    animationDuration: ANIMATION_MS,
    animationEasing: "ease-out" as const,
  };

  const renderChartItems = () => {
    switch (type) {
      case "pie": {
        return (
          <Pie
            data={chart.data}
            nameKey={chart.key(xAxis)}
            dataKey={chart.key(yAxis)}
            innerRadius={expanded ? "42%" : 35}
            outerRadius={expanded ? "80%" : 75}
            {...animationProps}
            startAngle={90}
            endAngle={-270}
          >
            {chart.data.map((entry) => (
              <Cell
                key={`cell-${entry[xAxis]}`}
                fill={chart.color(entry.color as string)}
                strokeWidth={1}
                stroke="var(--chakra-colors-bg)"
              />
            ))}
            <DonutCenterLabel
              total={pieTotal}
              axisKey={yAxis}
              expanded={expanded}
            />
          </Pie>
        );
      }
      case "scatter": {
        return chart.series.map((item) => (
          <Scatter
            key={item.name}
            name={item.name?.toString()}
            data={chart.data} // Scatter plots often use the full dataset
            fill={chart.color(item.color)}
            {...animationProps}
          />
        ));
      }
      case "line": {
        // Per-point dots clutter long series; keep them for short ones and
        // always show an emphasized dot on hover.
        const showDots = formattedData.length <= MAX_LINE_DOTS;
        return chart.series.map((item, idx) => (
          <Line
            key={item.name}
            type="monotone"
            name={item.name?.toString()}
            dataKey={chart.key(item.name)}
            stroke={chart.color(item.color)}
            strokeWidth={2}
            strokeDasharray={
              STROKE_DASH_PATTERNS[idx % STROKE_DASH_PATTERNS.length]
            }
            dot={showDots ? { r: 2.5, strokeWidth: 1 } : false}
            activeDot={{
              r: 4.5,
              strokeWidth: 2,
              stroke: "var(--chakra-colors-bg)",
            }}
            {...animationProps}
          />
        ));
      }
      case "area": {
        return chart.series.map((item, idx) => (
          <Area
            key={item.name}
            type="monotone"
            name={item.name?.toString()}
            dataKey={chart.key(item.name)}
            stackId="a"
            fill={chart.color(item.color)}
            fillOpacity={0.2}
            stroke={chart.color(item.color)}
            strokeWidth={2}
            strokeDasharray={
              STROKE_DASH_PATTERNS[idx % STROKE_DASH_PATTERNS.length]
            }
            activeDot={{
              r: 4.5,
              strokeWidth: 2,
              stroke: "var(--chakra-colors-bg)",
            }}
            {...animationProps}
          />
        ));
      }
      case "bar":
      case "grouped-bar":
      case "stacked-bar": {
        // Rounded tops read well on upward bars only — skip for stacked
        // segments and for divergent charts where bars also point down.
        const barRadius: [number, number, number, number] | undefined =
          type !== "stacked-bar" && !hasNegativeValues
            ? [3, 3, 0, 0]
            : undefined;
        return chart.series.map((item) => (
          <Bar
            key={item.name}
            name={item.name?.toString()}
            dataKey={chart.key(item.name)}
            stackId={type === "stacked-bar" ? "a" : undefined}
            fill={chart.color(item.color)}
            radius={barRadius}
            {...animationProps}
          >
            {typeof formattedData[0]?._barColor === "string" &&
              formattedData.map((entry, index) => (
                <Cell key={index} fill={String(entry._barColor)} />
              ))}
          </Bar>
        ));
      }
      default:
        return null;
    }
  };

  const pointsSummary =
    type === "pie"
      ? `${formattedData.length} slices`
      : `${formattedData.length} data points`;
  const chartLabel = [
    `${type} chart: ${widget.title || ""}.`,
    `${pointsSummary}.`,
    widget.description || "",
  ]
    .join(" ")
    .trim();

  return (
    <Box
      role="img"
      aria-label={chartLabel}
      tabIndex={0}
      borderRadius="sm"
      _focusVisible={{
        outline: "2px solid",
        outlineColor: "primary.focusRing",
        outlineOffset: "2px",
      }}
    >
      <Chart.Root
        maxH={expanded ? "75vh" : type === "pie" ? "190px" : "280px"}
        chart={chart}
        overflow="hidden"
      >
        <ChartTypeWrapper
          data={chart.data}
          // Anchor area fills to the data minimum when fitting, so the 0
          // baseline stops forcing the y-domain down to zero.
          {...(type === "area" && fitYAxis
            ? { baseValue: "dataMin" as const }
            : {})}
        >
          {type !== "pie" && (
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
          )}
          <Legend
            content={
              type === "pie" ? (
                <CustomPieLegend series={chart.series} shares={pieShares} />
              ) : (
                <Chart.Legend />
              )
            }
            align={type === "pie" ? "right" : "left"}
            layout={type === "pie" ? "vertical" : "horizontal"}
            verticalAlign={type === "pie" ? "middle" : "top"}
            wrapperStyle={{
              paddingBottom: "0.5rem",
              maxHeight: "100%",
              width: type === "pie" ? "42%" : undefined,
              overflow: "hidden",
            }}
          />
          {type !== "pie" && (
            <>
              <XAxis
                dataKey={chart.key(xAxis)}
                type={type === "scatter" ? "number" : undefined}
                name={xAxis}
                axisLine={false}
                tickLine={false}
                tickMargin={TICK_MARGIN}
                tick={
                  needsAngledTicks
                    ? { dx: -3, dy: 4, fontSize: TICK_FONT_PX }
                    : { fontSize: TICK_FONT_PX }
                }
                tickFormatter={(value: number) =>
                  type === "scatter"
                    ? String(formatYAxisLabel(value, chart.key(xAxis)))
                    : String(formatXAxisLabel(value, chart.key(xAxis)))
                }
                domain={type === "scatter" ? ["auto", "auto"] : undefined}
                angle={needsAngledTicks ? -35 : 0}
                textAnchor={needsAngledTicks ? "end" : "middle"}
                height={xAxisHeight}
                ticks={xTicks}
                interval={0}
                padding={
                  isNumericXAxis
                    ? { left: 10, right: needsAngledTicks ? 14 : 18 }
                    : undefined
                }
                fontSize={TICK_FONT_PX}
              >
                {xAxis && (
                  <Label
                    value={toAxisLabel(xAxis)}
                    position="insideBottom"
                    offset={2}
                    style={{
                      fontSize: TICK_FONT_PX,
                      fill: "var(--chakra-colors-fg-muted)",
                    }}
                  />
                )}
              </XAxis>
              <YAxis
                dataKey={type === "scatter" ? chart.key(yAxis) : undefined}
                type="number"
                name={yAxis}
                width={yAxisWidth}
                tickMargin={TICK_MARGIN}
                tickFormatter={(value: number) =>
                  String(formatYAxisLabel(value, chart.key(yAxis)))
                }
                axisLine={false}
                tickLine={false}
                // Default: floor at 0 for all-positive data, but extend below
                // zero for divergent datasets (e.g. GHG net flux sinks) so
                // negative bars aren't clipped. "Fit y-axis" rescales to the
                // data range for flat line/area/scatter series.
                domain={
                  fitYAxis &&
                  AXIS_FIT_TYPES.has(type) &&
                  Number.isFinite(dataMinValue)
                    ? [niceFloor(dataMinValue, dataMaxValue), "auto"]
                    : [(dataMin: number) => Math.min(0, dataMin), "auto"]
                }
                // Without this, recharts re-expands a fitted domain to cover
                // the 0 baseline that area fills contribute.
                allowDataOverflow={fitYAxis && AXIS_FIT_TYPES.has(type)}
                fontSize={TICK_FONT_PX}
              >
                {yAxis && (
                  <Label
                    value={toAxisLabel(yAxis)}
                    angle={-90}
                    position="insideLeft"
                    offset={0}
                    style={{
                      fontSize: TICK_FONT_PX,
                      fill: "var(--chakra-colors-fg-muted)",
                      textAnchor: "middle",
                    }}
                  />
                )}
              </YAxis>
              {hasNegativeValues && (
                <ReferenceLine
                  y={0}
                  stroke="var(--chakra-colors-neutral-400)"
                  strokeWidth={1}
                />
              )}
            </>
          )}
          <Tooltip
            cursor={{ fill: "var(--chakra-colors-black-alpha-200)" }}
            animationDuration={100}
            wrapperStyle={{ zIndex: 9000 }}
            content={
              type === "scatter" ? (
                <CustomScatterTooltip />
              ) : type === "pie" ? (
                <CustomPieTooltip total={pieTotal} />
              ) : (
                <Chart.Tooltip
                  formatter={(value) =>
                    formatTooltipValue(value, chart.key(yAxis))
                  }
                />
              )
            }
          />
          {renderChartItems()}
        </ChartTypeWrapper>
      </Chart.Root>
    </Box>
  );
}
