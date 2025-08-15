import { Box, Text, Heading } from "@chakra-ui/react";
import { InsightWidget, DatasetInfo } from "@/app/types/chat";
import TableWidget from "./widgets/TableWidget";
import ChakraLineChart from "./widgets/ChakraLineChart";
import ChakraBarChart from "./widgets/ChakraBarChart";
import DatasetCardWidget from "./widgets/DatasetCardWidget";

interface WidgetMessageProps {
  widgets: InsightWidget[];
  messageId?: string;
}

export default function WidgetMessage({ widgets, messageId }: WidgetMessageProps) {
  return (
    <Box
      bg="white"
      border="1px solid"
      borderColor="gray.200"
      borderRadius="lg"
      overflow="hidden"
    >
      {widgets.map((widget, index) => (
        <Box
          key={index}
          id={messageId ? `widget-${messageId}-${index}` : undefined}
          scrollMarginTop="56px"
          borderBottom={index < widgets.length - 1 ? "1px solid" : "none"}
          borderColor="gray.100"
        >
          <Box
            p={4}
            bg="gray.50"
            borderBottom="1px solid"
            borderColor="gray.100"
          >
            <Heading size="sm" mb={1}>
              {widget.title}
            </Heading>
            <Text fontSize="xs" color="gray.600">
              {widget.description}
            </Text>
          </Box>

          {widget.type === "bar" && (
            <ChakraBarChart
              data={widget.data as Array<{ [key: string]: unknown }>}
              title={widget.title}
              description={widget.description}
              xAxis={widget.xAxis}
              yAxis={widget.yAxis}
            />
          )}

          {widget.type === "table" && (
            <Box overflowX="auto" maxW="100%">
              <TableWidget
                data={
                  widget.data as Record<string, string | number | boolean>[]
                }
              />
            </Box>
          )}

          {widget.type === "line" && (
            <ChakraLineChart
              data={widget.data as Array<{ [key: string]: unknown }>}
              title={widget.title}
              description={widget.description}
              xAxis={widget.xAxis}
              yAxis={widget.yAxis}
            />
          )}

          {widget.type === "dataset-card" && (
            <Box p={4}>
              <DatasetCardWidget dataset={widget.data as DatasetInfo} />
            </Box>
          )}
        </Box>
      ))}
    </Box>
  );
}
