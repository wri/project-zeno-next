import { Cell, Legend, Pie, PieChart, Tooltip } from "recharts";
import { Chart, useChart } from "@chakra-ui/charts";
import getChartColors from "./ChartColors";

interface ChakraPieChartProps {
  data: Array<{
    [key: string]: unknown;
  }>;
  xAxis?: string;
  yAxis?: string;
}
export default function ChakraPieChart({
  data,
  xAxis,
  yAxis,
}: ChakraPieChartProps) {
  const chart = useChart({ data });
  const chartColors = getChartColors();

  return (
    <Chart.Root chart={chart}>
      <PieChart>
        <Legend content={<Chart.Legend />} />
        <Tooltip
          cursor={false}
          animationDuration={100}
          content={<Chart.Tooltip hideLabel />}
        />
        <Pie
          data={chart.data}
          innerRadius={50}
          outerRadius={100}
          isAnimationActive={false}
          dataKey={chart.key(yAxis)}
          nameKey={chart.key(xAxis)}
        >
          {chart.data.map((item, i) => {
            return (
              <Cell key={String(item[xAxis as string])} fill={chartColors[i]} />
            );
          })}
        </Pie>
      </PieChart>
    </Chart.Root>
  );
}
