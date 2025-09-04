import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Box, Text } from "@chakra-ui/react";
import { Chart, useChart } from "@chakra-ui/charts";
import formatBarChartData from "../../utils/formatBarChartData";

interface ChakraBarChartProps {
  data: Array<{
    [key: string]: unknown;
  }>;
  type: "bar" | "stacked-bar" | "grouped-bar";
  xAxis?: string;
  yAxis?: string;
}

export default function ChakraBarChart({
  data,
  type,
  xAxis,
  yAxis,
}: ChakraBarChartProps) {
  const { data: formattedData, series } = formatBarChartData(data, type, xAxis);
  const chart = useChart({ data: formattedData, series: series });

  // Custom label formatter for X-axis (truncate long names)
  const formatXAxisLabel = (value: string) => {
    if (typeof value === "string" && value.length > 10) {
      return `${value.slice(0, 10)}...`;
    }
    return value;
  };

  // Custom formatter for Y-axis (format large numbers)
  const formatYAxisLabel = (value: number) => {
    if (Math.abs(value) < 1000) return value.toLocaleString();
    if (Math.abs(value) < 1000000) return `${(value / 1000).toFixed(1)}K`;
    if (Math.abs(value) < 1000000000) return `${(value / 1000000).toFixed(1)}M`;
    return `${(value / 1000000000).toFixed(1)}B`;
  };

  return (
    <Chart.Root maxH="280px" chart={chart} overflow="hidden">
      <BarChart data={chart.data}>
        <CartesianGrid
          stroke={chart.color("border.muted")}
          strokeDasharray="3 3"
          vertical={false}
        />
        <Legend
          content={<Chart.Legend />}
          align="left"
          verticalAlign="top"
          wrapperStyle={{
            paddingBottom: "0.5rem",
            maxHeight: "100%",
            maxWidth: "100%",
            overflow: "auto",
          }}
        />
        <XAxis
          axisLine={false}
          tickLine={false}
          dataKey={xAxis}
          color="fg.subtle"
          tickFormatter={formatXAxisLabel}
        />
        <YAxis
          stroke={chart.color("border.emphasized")}
          color="fg.subtle"
          tickFormatter={formatYAxisLabel}
        />
        <Tooltip
          cursor={false}
          animationDuration={100}
          content={<Chart.Tooltip />}
        />
        {chart.series.map((item) => (
          <Bar
            isAnimationActive={false}
            key={item.name}
            dataKey={chart.key(item.name)}
            fill={chart.color(item.color)}
            stackId={type === "stacked-bar" ? item.stackId : undefined} // only include stackID for stacked bars
          />
        ))}
      </BarChart>
    </Chart.Root>
  );
}
