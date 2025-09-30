import { Box, Text, Heading, Flex, Separator } from "@chakra-ui/react";
import { InsightWidget, DatasetInfo } from "@/app/types/chat";
import TableWidget from "./widgets/TableWidget";
import DatasetCardWidget from "./widgets/DatasetCardWidget";
import ChartWidget from "./widgets/ChartWidget";
import { WidgetIcons } from "../ChatPanelHeader";

interface WidgetMessageProps {
  widget: InsightWidget;
}

export default function WidgetMessage({ widget }: WidgetMessageProps) {
  if (widget.type === "dataset-card") {
    return <DatasetCardWidget dataset={widget.data as DatasetInfo} />;
  }
  console.log(widget);
  return (
    <Box
      rounded="md"
      border="1px solid"
      borderColor="primary.fg"
      overflow="hidden"
    >
      <Flex px={4} py={3} gap={2} bgGradient="brandGradient">
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
          widget.type === "grouped-bar" ||
          widget.type === "line" ||
          widget.type === "area" ||
          widget.type === "pie" ||
          widget.type === "scatter") && <ChartWidget widget={widget} />}

        {widget.type === "table" && (
          <Box overflowX="auto" maxW="100%">
            <TableWidget
              data={widget.data as Record<string, string | number | boolean>[]}
            />
          </Box>
        )}
      </Flex>
    </Box>
  );
}
