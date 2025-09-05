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
  Legend,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import formatChartData, {
  formatYAxisLabel,
  formatXAxisLabel,
} from "@/app/utils/formatCharts";
import { InsightWidget } from "@/app/types/chat";

// Chart wrapper map
type ChartType =
  | "bar"
  | "stacked-bar"
  | "grouped-bar"
  | "line"
  | "area"
  | "pie"
  | "scatter";

interface ChartWidgetProps {
  widget: InsightWidget;
}
const chartWrappers: Record<ChartType, any> = {
  bar: BarChart,
  "stacked-bar": BarChart,
  "grouped-bar": BarChart,
  line: LineChart,
  area: AreaChart,
  pie: PieChart,
  scatter: ScatterChart,
};

// Chart item map
const chartItems: Record<ChartType, any> = {
  bar: Bar,
  "stacked-bar": Bar,
  "grouped-bar": Bar,
  line: Line,
  area: Area,
  pie: Pie,
  scatter: Scatter,
};

interface ChartWidgetProps {
  widget: InsightWidget;
}

const CustomScatterTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
    payload: { [key: string]: string | number };
  }>;
}) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0].payload;
    const xAxisKey = payload[0].name;
    const yAxisKey = payload[1].name;
    console.log(dataPoint)

    return (
      <Box bg="bg.panel" p={2} py={1} borderRadius="sm" boxShadow="sm">
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
            {xAxisKey === "year" ? payload[0].value : Number(payload[0].value).toLocaleString()}
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
            {yAxisKey === "year" ? payload[0].value : Number(payload[1].value).toLocaleString()}
          </Text>
        </Flex>
      </Box>
    );
  }

  return null;
};

const CustomPieTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
    payload: { [key: string]: string | number };
  }>;
}) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0];
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
            boxShadow={"inset"}
          />
          <Text as="span" fontFamily="body" mr={4}>
            {dataPoint.name}
          </Text>
          <Text fontFamily="mono" textAlign="right">
            {Number(dataPoint.value).toLocaleString()}
          </Text>
        </Flex>
      </Box>
    );
  }
  return null;
};

export default function ChartWidget({ widget }: ChartWidgetProps) {
  const { data, xAxis, yAxis, type } = widget;
  const ChartTypeWrapper = chartWrappers[type as ChartType];
  const ChartTypeItem = chartItems[type as ChartType];

  const { data: formattedData, series } = formatChartData(
    data,
    type,
    xAxis,
    yAxis
  );

  const chart = useChart({ data: formattedData, series: series });

  return (
    <Chart.Root maxH="280px" chart={chart} overflow="hidden">
      <ChartTypeWrapper data={chart.data}>
        {type !== "pie" && (
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
        )}
        <Legend
          content={type !== "pie" ? <Chart.Legend /> : undefined}
          align={type === "pie" ? "right" : "left"}
          layout={type === "pie" ? "vertical" : "horizontal"}
          verticalAlign={type === "pie" ? "middle" : "top"}
          wrapperStyle={
            type === "pie"
              ? { paddingRight: "25%", maxHeight: "100%", overflow: "auto" }
              : {
                  paddingBottom: "0.5rem",
                  maxHeight: "100%",
                  maxWidth: "100%",
                  overflow: "auto",
                }
          }
        />
        {type !== "pie" && (
          <>
            <XAxis
              dataKey={chart.key(xAxis)}
              type={type === "scatter" ? "number" : undefined}
              name={xAxis}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) =>
                type === "scatter"
                  ? formatYAxisLabel(value, chart.key(xAxis))
                  : formatXAxisLabel(value, chart.key(xAxis))
              }
              domain={type === "scatter" ? ["auto", "auto"] : undefined}
            />
            <YAxis
              dataKey={type === "scatter" ? chart.key(yAxis) : undefined}
              type="number"
              name={yAxis}
              tickFormatter={(value) =>
                formatYAxisLabel(value, chart.key(yAxis))
              }
              axisLine={false}
              tickLine={false}
              domain={["auto", "auto"]}
            />
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
              <CustomPieTooltip />
            ) : (
              <Chart.Tooltip />
            )
          }
        />
        {/* Render chart items */}
        {chart.series.map((item, idx) => (
          <ChartTypeItem
            key={item.name || idx}
            name={item.name?.toString()}
            nameKey={type === "pie" ? chart.key(xAxis) : null}
            dataKey={
              type === "pie"
                ? chart.key(yAxis)
                : type !== "scatter"
                ? chart.key(item.name)
                : undefined
            }
            data={type === "scatter" || type === "pie" ? chart.data : null}
            stackId={
              type === "stacked-bar"
                ? item.stackId
                : type === "area"
                ? "a"
                : undefined
            }
            fill={chart.color(item.color)}
            fillOpacity={type === "area" ? 0.2 : 1}
            stroke={
              type === "line" || type === "area"
                ? chart.color(item.color)
                : "none"
            }
            strokeWidth={type === "line" || type === "area" ? 2 : null}
            isAnimationActive={false}
            innerRadius={type === "pie" ? 50 : null}
            outerRadius={type === "pie" ? 100 : null}
          >
            {type === "pie" &&
              chart.data.map((entry: any) => (
                <Cell
                  key={String(entry[xAxis as string])}
                  fill={chart.color(entry.color)}
                  strokeWidth={1}
                  stroke="#fff"
                />
              ))}
          </ChartTypeItem>
        ))}
      </ChartTypeWrapper>
    </Chart.Root>
  );
}
