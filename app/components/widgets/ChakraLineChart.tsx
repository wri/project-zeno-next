import {
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Box, Text } from "@chakra-ui/react";
import { useColorModeValue } from "@/app/components/ui/color-mode";

interface ChakraLineChartProps {
  data: Array<{
    [key: string]: unknown;
  }>;
  xAxis?: string;
  yAxis?: string;
}

export default function ChakraLineChart({
  data,
  xAxis,
  yAxis,
}: ChakraLineChartProps) {
  const lineColor = useColorModeValue("#3182ce", "#90cdf4");
  const gridColor = useColorModeValue("#e2e8f0", "#2d3748");
  const textColor = useColorModeValue("#4a5568", "#a0aec0");

  // Transform data for recharts
  const chartData = data.map((item) => ({
    [xAxis as string]: item[xAxis as string],
    [yAxis as string]: item[yAxis as string],
    ...item,
  }));

  // Custom tooltip component
  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ value: number }>;
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
          <Text color={lineColor}>
            {`${yAxis}: ${payload[0].value.toLocaleString()}`}
          </Text>
        </Box>
      );
    }
    return null;
  };

  return (
    <Box height="400px" width="100%" fontSize="xs">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis
            dataKey={xAxis}
            stroke={textColor}
            fontSize="xs"
            fontWeight="normal"
            color="fg.muted"
          />
          <YAxis
            stroke={textColor}
            fontSize="xs"
            fontWeight="normal"
            color="fg.muted"
            tickFormatter={(value) => value.toLocaleString()}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey={yAxis}
            stroke={lineColor}
            strokeWidth={2}
            dot={{ fill: lineColor, strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, fill: lineColor }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}
