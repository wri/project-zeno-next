import { Box, Text, Heading } from "@chakra-ui/react";
import { InsightWidget } from "@/app/types/chat";
import TextWidget from "./widgets/TextWidget";
import ChartWidget from "./widgets/BarChartWidget";
import TableWidget from "./widgets/TableWidget";
import TimeSeriesWidget, { TimeSeriesDataPoint } from "./widgets/TimeSeriesWidget";

interface WidgetMessageProps {
  widgets: InsightWidget[];
}

export default function WidgetMessage({ widgets }: WidgetMessageProps) {
  return (
    <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="lg" overflow="hidden">
      {widgets.map((widget, index) => (
        <Box key={index} borderBottom={index < widgets.length - 1 ? "1px solid" : "none"} borderColor="gray.100">
          <Box p={4} bg="gray.50" borderBottom="1px solid" borderColor="gray.100">
            <Heading size="sm" mb={1}>
              {widget.title}
            </Heading>
            <Text fontSize="xs" color="gray.600">
              {widget.description}
            </Text>
          </Box>
          
          {widget.type === 'text' && (
            <TextWidget data={widget.data as string} />
          )}
          
          {widget.type === 'chart' && (
            <ChartWidget data={widget.data as { categories: string[]; values: number[]; unit?: string }} />
          )}
          
          {widget.type === 'table' && (
            <Box overflowX="auto" maxW="100%">
              <TableWidget data={widget.data as Record<string, string | number | boolean>[]} />
            </Box>
          )}
          
          {widget.type === 'timeseries' && (
            <TimeSeriesWidget 
              data={(widget.data as Record<string, unknown>)?.data as TimeSeriesDataPoint[] || []} 
              xlabel={(widget.data as Record<string, unknown>)?.xlabel as string}
              ylabel={(widget.data as Record<string, unknown>)?.ylabel as string}
              title={(widget.data as Record<string, unknown>)?.title as string}
              description={(widget.data as Record<string, unknown>)?.description as string}
              analysis={(widget.data as Record<string, unknown>)?.analysis as string}
            />
          )}
        </Box>
      ))}
    </Box>
  );
} 