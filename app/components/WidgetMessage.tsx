import { Box, Text, Heading, Flex, Separator } from "@chakra-ui/react";
import { InsightWidget, DatasetInfo } from "@/app/types/chat";
import TableWidget from "./widgets/TableWidget";
import DatasetCardWidget from "./widgets/DatasetCardWidget";
import ChartWidget from "./widgets/ChartWidget";
import { WidgetIcons } from "../ChatPanelHeader";
import VisualizationDisclaimer from "./VisualizationDisclaimer";

interface WidgetMessageProps {
  widget: InsightWidget;
}

export default function WidgetMessage({ widget }: WidgetMessageProps) {
  if (widget.type === "dataset-card") {
    return <DatasetCardWidget dataset={widget.data as DatasetInfo} />;
  }
  console.log(widget);
  const chartTypes: InsightWidget["type"][] = [
    "bar",
    "stacked-bar",
    "grouped-bar",
    "line",
    "area",
    "pie",
    "scatter",
  ];
  const isChartType = chartTypes.includes(widget.type);
  const showDisclaimer = isChartType || widget.type === "table";
  return (
    <Box
      rounded="md"
      border="1px solid"
      borderColor="blue.fg"
      overflow="hidden"
    >
      <Flex px={4} py={3} gap={2} bgGradient="LCLGradientLight">
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
        {isChartType && <ChartWidget widget={widget} />}

        {widget.type === "table" && (
          <Box overflowX="auto" maxW="100%">
            <TableWidget
              data={widget.data as Record<string, string | number | boolean>[]}
            />
          </Box>
        )}
        {showDisclaimer && <VisualizationDisclaimer />}
      </Flex>
    </Box>
  );
}
