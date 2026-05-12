"use client";

import { useMemo } from "react";
import { Box, Flex, IconButton, Text, Badge } from "@chakra-ui/react";
import { DotsSixVerticalIcon, XIcon } from "@phosphor-icons/react";
import type { PinnedInsight } from "@/app/types/portfolio";
import type { InsightWidget } from "@/app/types/chat";
import ChartIcon from "./ChartIcon";
import ChartWidget from "@/app/components/widgets/ChartWidget";
import WidgetErrorBoundary from "@/app/components/widgets/WidgetErrorBoundary";

type Props = {
  insight: PinnedInsight;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  isSeed?: boolean;
  onRemove?: () => void;
};

// Reconstruct an InsightWidget from the persisted PinnedInsight so we can
// reuse the chat's ChartWidget. We narrow at pin time (bar / line / pie /
// area / scatter) which is a subset of InsightWidget["type"], so this is
// always a safe upcast.
function toInsightWidget(insight: PinnedInsight): InsightWidget {
  return {
    type: insight.chartType,
    title: insight.title,
    description: insight.description ?? "",
    data: insight.data,
    xAxis: insight.xAxis ?? "",
    yAxis: insight.yAxis ?? "",
    datasetName: insight.datasetName,
  };
}

// Canvas block representing a pinned insight. Renders a real ChartWidget
// inside the block so reports and dashboards show the actual chart, not a
// stylised placeholder.
export default function InsightBlock({
  insight,
  dragHandleProps,
  isSeed = false,
  onRemove,
}: Props) {
  const widget = useMemo(() => toInsightWidget(insight), [insight]);
  const hasData =
    Array.isArray(insight.data) && (insight.data as unknown[]).length > 0;

  return (
    <Box
      position="relative"
      bg="bg"
      border="1px solid"
      borderColor="border"
      borderLeft="3px solid"
      borderLeftColor={isSeed ? "green.solid" : "primary.solid"}
      rounded="md"
      p={3}
      h="260px"
      overflow="hidden"
      display="flex"
      flexDir="column"
    >
      <Flex justify="space-between" align="flex-start" gap={2} mb={1}>
        <Box minW={0} flex="1">
          <Text
            fontSize="xs"
            fontWeight="semibold"
            color="fg"
            lineHeight="short"
            css={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {insight.title}
          </Text>
          <Text fontSize="2xs" color="fg.muted" mt={0.5} truncate>
            {insight.datasetName ? `${insight.datasetName} · ` : ""}
            {insight.aoi.isMultiArea
              ? `Multi-area · ${insight.aoi.src_ids.length}`
              : insight.aoi.name}
          </Text>
        </Box>
        <Flex gap={1} align="center" flexShrink={0}>
          {isSeed && (
            <Badge size="xs" colorPalette="green" variant="subtle">
              Seed
            </Badge>
          )}
          {onRemove && (
            <IconButton
              aria-label="Remove block"
              size="2xs"
              variant="ghost"
              onClick={onRemove}
            >
              <XIcon size={12} />
            </IconButton>
          )}
          {dragHandleProps && (
            <Box
              {...dragHandleProps}
              cursor="grab"
              color="fg.muted"
              opacity={0.5}
              _hover={{ opacity: 1 }}
              touchAction="none"
            >
              <DotsSixVerticalIcon size={14} />
            </Box>
          )}
        </Flex>
      </Flex>
      <Box flex="1" minH={0} mt={1}>
        {hasData ? (
          <WidgetErrorBoundary fallbackTitle="Unable to render chart">
            <ChartWidget widget={widget} />
          </WidgetErrorBoundary>
        ) : (
          <Flex
            h="100%"
            align="center"
            justify="center"
            bg="bg.subtle"
            rounded="sm"
            color="fg.muted"
            fontSize="xs"
          >
            <ChartIcon
              type={insight.chartType}
              size={48}
              color={`var(--chakra-colors-${isSeed ? "green" : "primary"}-fg)`}
            />
          </Flex>
        )}
      </Box>
    </Box>
  );
}
