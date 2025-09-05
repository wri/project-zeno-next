import { Chart, useChart } from "@chakra-ui/charts";
import {
  Scatter,
  ScatterChart,
  CartesianGrid,
  Legend,
  Tooltip,
  TooltipProps,
  XAxis,
  YAxis,
} from "recharts";
import {
  ValueType,
  NameType,
} from "recharts/types/component/DefaultTooltipContent";
import formatChartData, { formatYAxisLabel } from "@/app/utils/formatCharts";
import { Box, Flex, Heading, Text } from "@chakra-ui/react";

interface ChakraScatterChartProps {
  data: Array<{
    [key: string]: unknown;
  }>;
  xAxis?: string;
  yAxis?: string;
}

const CustomScatterTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
    payload: { [key: string]: any };
  }>;
  label?: string;
}) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0].payload;
    const xAxisKey = payload[0].name;
    const yAxisKey = payload[1].name;

    return (
      <Box bg="surface" p={2} borderRadius="sm" boxShadow="sm" zIndex="1000">
        <Heading size="xs" mb={0}>
          {dataPoint.name}
        </Heading>
        <Flex
          justifyContent="space-between"
          fontSize="xs"
          fontWeight="normal"
          color="fg.muted"
        >
          <Text as="span" fontFamily="body" mr={4}>
            {xAxisKey}
          </Text>{" "}
          <Text fontFamily="mono" textAlign="right">
            {Number(payload[0].value).toLocaleString()}
          </Text>
        </Flex>
        <Flex
          justifyContent="space-between"
          fontSize="xs"
          fontWeight="normal"
          color="fg.muted"
        >
          <Text as="span" fontFamily="body" mr={4}>
            {yAxisKey}
          </Text>{" "}
          <Text fontFamily="mono" textAlign="right">
            {Number(payload[1].value).toLocaleString()}
          </Text>
        </Flex>
      </Box>
    );
  }

  return null;
};

export default function ChakraScatterChart({
  data,
  xAxis,
  yAxis,
}: ChakraScatterChartProps) {
  const { data: formattedData, series } = formatChartData(
    data,
    "scatter",
    xAxis,
    yAxis
  );
  const chart = useChart({ data: formattedData, series: series });

  return (
    <Chart.Root maxH="280px" chart={chart} overflow="hidden">
      <ScatterChart data={chart.data}>
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
        <XAxis
          type="number"
          name={xAxis}
          dataKey={chart.key(xAxis)}
          stroke={chart.color("border")}
          tickFormatter={formatYAxisLabel}
        />
        <YAxis
          type="number"
          dataKey={chart.key(yAxis)}
          name={yAxis}
          stroke={chart.color("border")}
          tickFormatter={formatYAxisLabel}
        />
        <Tooltip
          cursor={false}
          animationDuration={100}
          content={<CustomScatterTooltip />}
        />
        {chart.series.map((item, index) => (
          <Scatter
            name={item.name?.toString()}
            key={index}
            data={chart.data}
            fill={chart.color(item.color)}
            isAnimationActive={false}
          />
        ))}
      </ScatterChart>
    </Chart.Root>
  );
}
