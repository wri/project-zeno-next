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
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import formatChartData, {
  formatYAxisLabel,
  formatXAxisLabel,
  toAxisLabel,
} from "@/app/utils/formatCharts";
import { InsightWidget } from "@/app/types/chat";
import { STROKE_DASH_PATTERNS } from "@/app/utils/ChartColors";

type ChartType =
  | "bar"
  | "stacked-bar"
  | "grouped-bar"
  | "line"
  | "area"
  | "pie"
  | "scatter";

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
    const xAxisPayload = payload[0];
    const yAxisPayload = payload[1];

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
        <Flex
          justifyContent="space-between"
          fontSize="xs"
          fontWeight="normal"
          color="fg.muted"
        >
          <Text as="span" mr={4}>
            {xAxisPayload.name}
          </Text>
          <Text fontFamily="mono" textAlign="right">
            {xAxisPayload.name === "year"
              ? xAxisPayload.value
              : Number(xAxisPayload.value).toLocaleString()}
          </Text>
        </Flex>
        <Flex
          justifyContent="space-between"
          fontSize="xs"
          fontWeight="normal"
          color="fg.muted"
        >
          <Text as="span" mr={4}>
            {yAxisPayload.name}
          </Text>
          <Text fontFamily="mono" textAlign="right">
            {/* FIX: Correctly reference the y-axis payload value */}
            {yAxisPayload.name === "year"
              ? yAxisPayload.value
              : Number(yAxisPayload.value).toLocaleString()}
          </Text>
        </Flex>
      </Box>
    );
  }

  return null;
};

interface CustomPieLegendProps {
  series: { name?: string | number; color?: string }[];
}

const CustomPieLegend = ({ series }: CustomPieLegendProps) => {
  if (!series) return null;

  return (
    <Flex direction="column" gap={2} as="ul" listStyleType="none" m={0} p={0}>
      {series
        .filter((entry) => entry.name && entry.color)
        .map((entry, index) => (
          <Flex as="li" key={`item-${index}`} align="center" gap={2}>
            <Box
              w={4}
              h={4}
              bg={entry.color}
              border="1px solid"
              borderColor="neutral.400"
              rounded="sm"
            />
            <Text fontSize="xs" color="neutral.500">
              {String(entry.name)}
            </Text>
          </Flex>
        ))}
    </Flex>
  );
};

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
            {value.toLocaleString()}
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

export default function ChartWidget({ widget, expanded = false }: ChartWidgetProps) {
  const { data, xAxis, yAxis, type } = widget;
  const ChartTypeWrapper = chartWrappers[type as ChartType];

  const { data: formattedData, series } = useMemo(
    () => formatChartData(data, type, xAxis, yAxis),
    [data, type, xAxis, yAxis]
  );

  const chart = useChart({ data: formattedData, series: series });

  // Compute pie total for percentage display in tooltips
  const pieTotal = useMemo(() => {
    if (type !== "pie" || !yAxis) return 0;
    return formattedData.reduce((sum, d) => sum + (Number(d[yAxis]) || 0), 0);
  }, [type, yAxis, formattedData]);

  if (!ChartTypeWrapper || formattedData.length === 0 || series.length === 0) {
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
          {!ChartTypeWrapper
            ? `Unsupported chart type: "${type}"`
            : "No data available for this chart."}
        </Text>
      </Flex>
    );
  }

  // Determine if the x-axis has long categorical labels that need angling
  const isNumericXAxis =
    type === "scatter" ||
    xAxis?.toLowerCase() === "year" ||
    (formattedData.length > 0 && typeof formattedData[0][xAxis] === "number");
  const needsAngledTicks = !isNumericXAxis && formattedData.length > 4;

  const renderChartItems = () => {
    switch (type) {
      case "pie": {
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
                stroke="var(--chakra-colors-bg)"
              />
            ))}
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
            isAnimationActive={false}
          />
        ));
      }
      case "line": {
        return chart.series.map((item, idx) => (
          <Line
            key={item.name}
            type="monotone"
            name={item.name?.toString()}
            dataKey={chart.key(item.name)}
            stroke={chart.color(item.color)}
            strokeWidth={2}
            strokeDasharray={STROKE_DASH_PATTERNS[idx % STROKE_DASH_PATTERNS.length]}
            isAnimationActive={false}
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
            strokeDasharray={STROKE_DASH_PATTERNS[idx % STROKE_DASH_PATTERNS.length]}
            isAnimationActive={false}
          />
        ));
      }
      case "bar":
      case "grouped-bar":
      case "stacked-bar": {
        return chart.series.map((item) => (
          <Bar
            key={item.name}
            name={item.name?.toString()}
            dataKey={chart.key(item.name)}
            stackId={type === "stacked-bar" ? "a" : undefined}
            fill={chart.color(item.color)}
            isAnimationActive={false}
          />
        ));
      }
      default:
        return null;
    }
  };

  const chartLabel = `${type} chart: ${widget.title || ""}. ${widget.description || ""}`.trim();

  return (
    <Box role="img" aria-label={chartLabel} tabIndex={0}>
    <Chart.Root maxH={expanded ? "520px" : "280px"} chart={chart} overflow="hidden">
      <ChartTypeWrapper data={chart.data}>
        {type !== "pie" && (
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
        )}
        <Legend
          content={
            type === "pie" ? (
              <CustomPieLegend series={chart.series} />
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
            maxWidth: "100%",
            overflow: "auto",
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
              tickFormatter={(value: number) =>
                type === "scatter"
                  ? String(formatYAxisLabel(value, chart.key(xAxis)))
                  : String(formatXAxisLabel(value, chart.key(xAxis)))
              }
              domain={type === "scatter" ? ["auto", "auto"] : undefined}
              angle={needsAngledTicks ? -35 : 0}
              textAnchor={needsAngledTicks ? "end" : "middle"}
              height={needsAngledTicks ? 80 : 40}
              interval={0}
              fontSize={11}
            >
              {xAxis && (
                <Label
                  value={toAxisLabel(xAxis)}
                  position="insideBottom"
                  offset={-2}
                  style={{ fontSize: 11, fill: "var(--chakra-colors-fg-muted)" }}
                />
              )}
            </XAxis>
            <YAxis
              dataKey={type === "scatter" ? chart.key(yAxis) : undefined}
              type="number"
              name={yAxis}
              tickFormatter={(value: number) =>
                String(formatYAxisLabel(value, chart.key(yAxis)))
              }
              axisLine={false}
              tickLine={false}
              domain={["auto", "auto"]}
            >
              {yAxis && (
                <Label
                  value={toAxisLabel(yAxis)}
                  angle={-90}
                  position="insideLeft"
                  offset={10}
                  style={{ fontSize: 11, fill: "var(--chakra-colors-fg-muted)", textAnchor: "middle" }}
                />
              )}
            </YAxis>
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
              <Chart.Tooltip />
            )
          }
        />
        {renderChartItems()}
      </ChartTypeWrapper>
    </Chart.Root>
    </Box>
  );
}
