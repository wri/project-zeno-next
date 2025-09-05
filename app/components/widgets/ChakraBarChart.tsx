import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Chart, useChart } from "@chakra-ui/charts";
import formatChartData, {
  formatYAxisLabel,
  formatXAxisLabel,
} from "../../utils/formatCharts";

interface ChakraBarChartProps {
  data: Array<{
    [key: string]: unknown;
  }>;
  type: "bar" | "stacked-bar" | "grouped-bar";
  xAxis?: string;
}

export default function ChakraBarChart({
  data,
  type,
  xAxis,
}: ChakraBarChartProps) {
  const { data: formattedData, series } = formatChartData(data, type, xAxis);
  const chart = useChart({ data: formattedData, series: series });

  return (
    <Chart.Root maxH="280px" chart={chart} overflow="hidden">
      <BarChart data={chart.data}>
        <CartesianGrid
          stroke={"border.muted"}
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
          stroke={"border.muted"}
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
