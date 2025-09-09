import { Box, Text, Heading, Flex, Separator } from "@chakra-ui/react";
import { InsightWidget, DatasetInfo } from "@/app/types/chat";
import TableWidget from "./widgets/TableWidget";
import ChakraLineChart from "./widgets/ChakraLineChart";
import ChakraBarChart from "./widgets/ChakraBarChart";
import ChakraAreaChart from "./widgets/ChakraAreaChart";
import ChakraScatterChart from "./widgets/ChakraScatterChart";
import DatasetCardWidget from "./widgets/DatasetCardWidget";
import { WidgetIcons } from "../ChatPanelHeader";
import ChakraPieChart from "./widgets/ChakraPieChart";

interface WidgetMessageProps {
  widget: InsightWidget;
}

export default function WidgetMessage({ widget }: WidgetMessageProps) {
  if (widget.type === "dataset-card") {
    return <DatasetCardWidget dataset={widget.data as DatasetInfo} />;
  }

  return (
    <Box
      rounded="md"
      border="1px solid"
      borderColor="blue.fg"
      overflow="hidden"
    >
      <Flex
        px={4}
        py={3}
        gap={2}
        bgGradient="LCLGradientLight"
      >
        {WidgetIcons[widget.type]}
        <Heading size="xs" fontWeight="medium" color="primary.fg" m={0}>
          {widget.title}
        </Heading>
      </Flex>
      <Flex gap={3} px={4} py={3} flexDir="column">
        <Text fontSize="xs" color="fg.muted">
          {widget.description}
        </Text>
        <Separator />

        {(widget.type === "bar" ||
          widget.type === "stacked-bar" ||
          widget.type === "grouped-bar") && (
          <ChakraBarChart
            data={widget.data as Array<{ [key: string]: unknown }>}
            xAxis={widget.xAxis}
            type={widget.type}
          />
        )}

        {widget.type === "table" && (
          <Box overflowX="auto" maxW="100%">
            <TableWidget
              data={widget.data as Record<string, string | number | boolean>[]}
            />
          </Box>
        )}

        {widget.type === "pie" && (
          <ChakraPieChart
            data={widget.data as Array<{ [key: string]: unknown }>}
            xAxis={widget.xAxis}
            yAxis={widget.yAxis}
          />
        )}

        {widget.type === "line" && (
          <ChakraLineChart
            data={widget.data as Array<{ [key: string]: unknown }>}
            xAxis={widget.xAxis}
            yAxis={widget.yAxis}
          />
        )}
        {widget.type === "area" && (
          <ChakraAreaChart
            data={widget.data as Array<{ [key: string]: unknown }>}
            xAxis={widget.xAxis}
          />
        )}
        {widget.type === "scatter" && ( 
          <ChakraScatterChart
            data={widget.data as Array<{ [key: string]: unknown }>}
            xAxis={widget.xAxis}
            yAxis={widget.yAxis}
          />
        ) }
      </Flex>
    </Box>
  );
}
