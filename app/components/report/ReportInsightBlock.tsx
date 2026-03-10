"use client";

import { useState } from "react";
import { Box, Heading, Text, Separator, Flex, Badge } from "@chakra-ui/react";
import { PinnedWidget } from "@/app/types/report";
import { InsightWidget } from "@/app/types/chat";
import ChartWidget from "@/app/components/widgets/ChartWidget";
import TableWidget from "@/app/components/widgets/TableWidget";
import { WidgetIcons } from "@/app/ChatPanelHeader";

interface Props {
  widget: PinnedWidget;
}

function toInsightWidget(w: PinnedWidget): InsightWidget {
  return {
    type: w.type,
    title: w.title,
    description: w.description,
    data: w.data,
    xAxis: w.xAxis,
    yAxis: w.yAxis,
  };
}

const CHART_TYPES: InsightWidget["type"][] = [
  "bar",
  "stacked-bar",
  "grouped-bar",
  "line",
  "area",
  "pie",
  "scatter",
];

export default function ReportInsightBlock({ widget }: Props) {
  const hasVariants = widget.variants && widget.variants.length > 1;
  const [activeIndex, setActiveIndex] = useState(0);

  // Resolve active widget (variant or the widget itself)
  const activeWidget =
    hasVariants && widget.variants
      ? widget.variants[Math.min(activeIndex, widget.variants.length - 1)]
      : widget;

  const insightWidget = toInsightWidget(activeWidget);
  const isChart = CHART_TYPES.includes(activeWidget.type);

  return (
    <Box
      rounded="md"
      border="1px solid"
      borderColor="blue.fg"
      overflow="hidden"
    >
      <Flex px={4} py={3} gap={2} bgGradient="LCLGradientLight" align="center">
        {WidgetIcons[activeWidget.type]}
        <Heading size="xs" fontWeight="medium" color="primary.fg" m={0}>
          {widget.title}
        </Heading>

        {/* Area selector for per-area variants */}
        {hasVariants && widget.variants && (
          <select
            style={{
              marginLeft: "auto",
              fontSize: "0.75rem",
              padding: "2px 8px",
              borderRadius: "6px",
              border: "1px solid var(--chakra-colors-border-muted)",
              background: "var(--chakra-colors-bg-panel, #fff)",
              cursor: "pointer",
            }}
            value={activeIndex}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setActiveIndex(Number(e.target.value))}
          >
            {widget.variants.map((v, i) => (
              <option key={i} value={i}>
                {v.areaLabel ?? v.title}
              </option>
            ))}
          </select>
        )}

        {!hasVariants && (
          <Badge size="xs" ml="auto" colorPalette="gray">
            Pinned
          </Badge>
        )}
        {hasVariants && widget.variants && (
          <Badge size="xs" colorPalette="blue" variant="subtle">
            {widget.variants.length} areas
          </Badge>
        )}
      </Flex>
      <Box px={4} py={3}>
        {activeWidget.description && (
          <>
            <Text fontSize="xs" color="fg.muted" mb={2}>
              {activeWidget.description}
            </Text>
            <Separator mb={3} />
          </>
        )}
        {isChart && <ChartWidget widget={insightWidget} />}
        {activeWidget.type === "table" && (
          <Box overflowX="auto" maxW="100%">
            <TableWidget
              data={
                activeWidget.data as Record<
                  string,
                  string | number | boolean
                >[]
              }
            />
            {activeWidget.truncatedFrom && (
              <Text fontSize="xs" color="fg.muted" mt={2}>
                Showing 10 of {activeWidget.truncatedFrom} rows
              </Text>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}
