"use client";

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
  CartesianGrid,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import formatChartData, {
  formatXAxisLabel,
  formatYAxisLabel,
} from "@/app/utils/formatCharts";
import type { DetectedChartConfig } from "../types/stream";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ChartCardProps {
  config: DetectedChartConfig;
  /** Raw long-format data rows (from AnalyticsDataItem.data.data). */
  rawData: Record<string, unknown>[];
  /** If true, render without wrapper chrome (for embedding in GreyedChartCard). */
  bare?: boolean;
}

// ---------------------------------------------------------------------------
// Chart type → Recharts wrapper
// ---------------------------------------------------------------------------

type ChartWrapperComponent =
  | typeof BarChart
  | typeof AreaChart
  | typeof LineChart
  | typeof PieChart;

const chartWrappers: Record<string, ChartWrapperComponent> = {
  bar: BarChart,
  "stacked-bar": BarChart,
  "grouped-bar": BarChart,
  line: LineChart,
  area: AreaChart,
  pie: PieChart,
};

// ---------------------------------------------------------------------------
// Pie legend (standalone)
// ---------------------------------------------------------------------------

function PieLegend({
  series,
}: {
  series: { name?: string | number; color?: string }[];
}) {
  return (
    <Flex
      direction="column"
      gap={1}
      as="ul"
      listStyleType="none"
      m={0}
      p={0}
    >
      {series
        .filter((entry) => entry.name && entry.color)
        .map((entry, index) => (
          <Flex as="li" key={`item-${index}`} align="center" gap={2}>
            <Box
              w={3}
              h={3}
              bg={entry.color}
              border="1px solid"
              borderColor="neutral.400"
              rounded="sm"
              flexShrink={0}
            />
            <Text fontSize="xs" color="fg.muted" lineClamp={1}>
              {String(entry.name)}
            </Text>
          </Flex>
        ))}
    </Flex>
  );
}

// ---------------------------------------------------------------------------
// Pie tooltip
// ---------------------------------------------------------------------------

function PieTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
    payload: { [key: string]: string | number };
  }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <Box bg="bg.panel" p={2} py={1} borderRadius="sm" boxShadow="sm">
      <Flex fontSize="xs" color="fg.muted" gap={1} align="center">
        <Box
          h={2}
          w={2}
          rounded="full"
          bg={d.payload.color as string}
          flexShrink={0}
        />
        <Text as="span" mr={4}>
          {d.name}
        </Text>
        <Text fontFamily="mono" textAlign="right">
          {Number(d.value).toLocaleString()}
        </Text>
      </Flex>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ChartCard({ config, rawData, bare }: ChartCardProps) {
  const { type, xAxis, yAxis, pivotedData, label } = config;

  // Always prefer pivotedData when available — it's been reshaped to match
  // what formatChartData expects for the given chart type.
  const chartInputData = pivotedData ?? rawData;

  const { data: formattedData, series } = formatChartData(
    chartInputData,
    type as Parameters<typeof formatChartData>[1],
    xAxis,
    yAxis,
  );

  const chart = useChart({ data: formattedData, series });

  const ChartWrapper = chartWrappers[type] ?? BarChart;
  const isPie = type === "pie";
  const isCartesian = !isPie && type !== "scatter";

  // Empty state
  if (formattedData.length === 0) {
    const content = (
      <Box py={3}>
        <Text fontSize="sm" color="fg.muted">
          No chart data available.
        </Text>
      </Box>
    );
    return bare ? content : <Box>{content}</Box>;
  }

  // Render chart items based on type
  const renderItems = () => {
    switch (type) {
      case "pie":
        return (
          <Pie
            data={chart.data}
            nameKey={chart.key(xAxis)}
            dataKey={chart.key(yAxis)}
            innerRadius={50}
            outerRadius={100}
            isAnimationActive={false}
            startAngle={90}
            endAngle={-270}
          >
            {chart.data.map((entry) => (
              <Cell
                key={`cell-${entry[xAxis]}`}
                fill={chart.color(entry.color as string)}
                strokeWidth={1}
                stroke="#fff"
              />
            ))}
          </Pie>
        );

      case "line":
        return chart.series.map((s) => (
          <Line
            key={s.name}
            type="monotone"
            name={s.name?.toString()}
            dataKey={chart.key(s.name)}
            stroke={chart.color(s.color)}
            strokeWidth={2}
            isAnimationActive={false}
          />
        ));

      case "area":
        return chart.series.map((s) => (
          <Area
            key={s.name}
            type="monotone"
            name={s.name?.toString()}
            dataKey={chart.key(s.name)}
            fill={chart.color(s.color)}
            fillOpacity={0.2}
            stroke={chart.color(s.color)}
            strokeWidth={2}
            isAnimationActive={false}
          />
        ));

      case "bar":
      case "stacked-bar":
      case "grouped-bar":
        return chart.series.map((s) => (
          <Bar
            key={s.name}
            name={s.name?.toString()}
            dataKey={chart.key(s.name)}
            stackId={type === "stacked-bar" ? "a" : undefined}
            fill={chart.color(s.color)}
            isAnimationActive={false}
          />
        ));

      default:
        return null;
    }
  };

  const chartContent = (
    <Box>
      <Heading size="xs" fontWeight="medium" mb={2} color="fg">
        {label}
      </Heading>
      <Chart.Root maxH="280px" chart={chart} overflow="hidden">
        <ChartWrapper data={chart.data}>
          {isCartesian && (
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
          )}
          <Legend
            content={
              isPie ? (
                <PieLegend series={chart.series} />
              ) : (
                <Chart.Legend />
              )
            }
            align={isPie ? "right" : "left"}
            layout={isPie ? "vertical" : "horizontal"}
            verticalAlign={isPie ? "middle" : "top"}
            wrapperStyle={{
              paddingBottom: "0.5rem",
              maxHeight: "100%",
              maxWidth: "100%",
              overflow: "auto",
            }}
          />
          {isCartesian && (
            <>
              <XAxis
                dataKey={chart.key(xAxis)}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) =>
                  String(formatXAxisLabel(v, chart.key(xAxis)))
                }
              />
              <YAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) =>
                  String(formatYAxisLabel(v, chart.key(yAxis)))
                }
                domain={["auto", "auto"]}
              />
            </>
          )}
          <Tooltip
            cursor={{ fill: "var(--chakra-colors-black-alpha-200)" }}
            animationDuration={100}
            wrapperStyle={{ zIndex: 9000 }}
            content={isPie ? <PieTooltip /> : <Chart.Tooltip />}
          />
          {renderItems()}
        </ChartWrapper>
      </Chart.Root>
    </Box>
  );

  if (bare) return chartContent;

  return (
    <Box
      rounded="md"
      border="1px solid"
      borderColor="border"
      overflow="hidden"
    >
      <Box px={4} py={3}>
        {chartContent}
      </Box>
    </Box>
  );
}
