import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Chart, useChart } from "@chakra-ui/charts";
import formatChartData, { formatYAxisLabel } from "@/app/utils/formatCharts";

interface ChakraAreaChartProps {
  data: Array<{
    [key: string]: unknown;
  }>;
  xAxis?: string;
}

export default function ChakraAreaChart({ data, xAxis }: ChakraAreaChartProps) {
  const { data: formattedData, series } = formatChartData(data, "bar", xAxis);
  const chart = useChart({ data: formattedData, series: series });

  return (
    <Chart.Root maxH="280px" chart={chart} overflow="hidden">
      <AreaChart data={chart.data}>
        <CartesianGrid
          vertical={false}
          stroke={"border.muted"}
          strokeDasharray="3 3"
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
        <XAxis axisLine={false} tickLine={false} dataKey={chart.key(xAxis)} />
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
          <Area
            key={item.name}
            isAnimationActive={false}
            dataKey={chart.key(item.name)}
            fill={chart.color(item.color)}
            fillOpacity={0.2}
            stroke={chart.color(item.color)}
            stackId="a"
          />
        ))}
      </AreaChart>
    </Chart.Root>
  );
}
