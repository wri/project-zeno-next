import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Box, Text } from "@chakra-ui/react";
import { Chart, useChart } from "@chakra-ui/charts";
import { useColorModeValue } from "@/app/components/ui/color-mode";
import getChartColors from "./ChartColors";

interface ChakraBarChartProps {
  data: Array<{
    [key: string]: unknown;
  }>;
  type: "bar" | "stacked-bar" | "grouped-bar";
  xAxis?: string;
  yAxis?: string;
}

interface DataSeriesItem {
  name: string;
  color: string;
  stackId: string;
}

export default function ChakraBarChart({
  data,
  type,
  xAxis,
  yAxis,
}: ChakraBarChartProps) {
  const barColor = useColorModeValue("#3182ce", "#63b3ed");
  const gridColor = useColorModeValue("#e2e8f0", "#2d3748");
  const textColor = useColorModeValue("#4a5568", "#a0aec0");

  // Transform data for recharts
  const chartData = data.map((item) => ({
    [xAxis as string]: item[xAxis as string],
    [yAxis as string]: item[yAxis as string],
    ...item,
  }));

  const chartColors = getChartColors();

  const series: DataSeriesItem[] = Object.keys(data[0])
    .filter((key) => key !== xAxis)
    .map((key, index) => ({
      name: key,
      color: chartColors[index], // Get color from the function's output array
      stackId: "a", // Add the consistent stackId
    }));

  console.log(series);

  const chart = useChart({ data: data, series: series });
  console.log(chart);
  // Custom tooltip component
  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ value: number; name: string }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <Box
          bg="white"
          p={3}
          border="1px solid"
          borderColor="gray.200"
          borderRadius="md"
          boxShadow="md"
          fontSize="xs"
          fontWeight="normal"
        >
          <Text fontWeight="medium">{`${xAxis}: ${label}`}</Text>
          <Text color={barColor}>
            {`${yAxis}: ${payload[0].value.toLocaleString()}`}
          </Text>
        </Box>
      );
    }
    return null;
  };

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

  if (type === "stacked-bar") {
    return (
      <Chart.Root maxH="280px" chart={chart}>
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
            wrapperStyle={{ paddingBottom: "0.5rem" }}
          />
          <XAxis
            axisLine={false}
            tickLine={false}
            dataKey={chart.key("month")}
            tickFormatter={(value) => value.slice(0, 3)}
          />
          <YAxis
            stroke={chart.color("border.emphasized")}
            tickFormatter={formatYAxisLabel}
          />
          <Tooltip
            cursor={false}
            animationDuration={100}
            content={<Chart.Tooltip />}
          />
          {chart.series.map((item, i) => (
            <Bar
              isAnimationActive={false}
              key={item.name}
              dataKey={chart.key(item.name)}
              fill={chart.color(item.color)}
              stackId={item.stackId}
            />
          ))}
        </BarChart>
      </Chart.Root>
    );
  }
  return (
    <Box height="400px" width="100%">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis
            dataKey={xAxis}
            stroke={textColor}
            fontSize="xs"
            fontWeight="normal"
            color="fg.muted"
            tickFormatter={formatXAxisLabel}
          />
          <YAxis
            stroke={textColor}
            fontSize="xs"
            fontWeight="normal"
            color="fg.muted"
            tickFormatter={formatYAxisLabel}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey={yAxis} fill={barColor} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}
