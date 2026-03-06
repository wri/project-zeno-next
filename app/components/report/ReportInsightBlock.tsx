"use client";

import { Box, Heading, Text, Separator, Flex, Badge } from "@chakra-ui/react";
import { PinnedWidget } from "@/app/types/report";
import { InsightWidget } from "@/app/types/chat";
import ChartWidget from "@/app/components/widgets/ChartWidget";
import TableWidget from "@/app/components/widgets/TableWidget";
import { WidgetIcons } from "@/app/ChatPanelHeader";

interface Props {
  widget: PinnedWidget;
}

export default function ReportInsightBlock({ widget }: Props) {
  const insightWidget: InsightWidget = {
    type: widget.type,
    title: widget.title,
    description: widget.description,
    data: widget.data,
    xAxis: widget.xAxis,
    yAxis: widget.yAxis,
  };

  const chartTypes: InsightWidget["type"][] = [
    "bar",
    "stacked-bar",
    "grouped-bar",
    "line",
    "area",
    "pie",
    "scatter",
  ];
  const isChart = chartTypes.includes(widget.type);

  return (
    <Box rounded="md" border="1px solid" borderColor="blue.fg" overflow="hidden">
      <Flex px={4} py={3} gap={2} bgGradient="LCLGradientLight" align="center">
        {WidgetIcons[widget.type]}
        <Heading size="xs" fontWeight="medium" color="primary.fg" m={0}>
          {widget.title}
        </Heading>
        <Badge size="xs" ml="auto" colorPalette="gray">
          Pinned
        </Badge>
      </Flex>
      <Box px={4} py={3}>
        <Text fontSize="xs" color="fg.muted" mb={2}>
          {widget.description}
        </Text>
        <Separator mb={3} />
        {isChart && <ChartWidget widget={insightWidget} />}
        {widget.type === "table" && (
          <Box overflowX="auto" maxW="100%">
            <TableWidget
              data={
                widget.data as Record<string, string | number | boolean>[]
              }
            />
            {widget.truncatedFrom && (
              <Text fontSize="xs" color="fg.muted" mt={2}>
                Showing 10 of {widget.truncatedFrom} rows
              </Text>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}
