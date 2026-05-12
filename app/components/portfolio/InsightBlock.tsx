"use client";

import { useMemo } from "react";
import {
  Box,
  Flex,
  Heading,
  IconButton,
  Separator,
  Badge,
} from "@chakra-ui/react";
import {
  DotsSixVerticalIcon,
  XIcon,
  ArrowsOutLineHorizontalIcon,
  ArrowsInLineHorizontalIcon,
  MapPinPlusIcon,
} from "@phosphor-icons/react";
import type { BlockSize, PinnedInsight } from "@/app/types/portfolio";
import type { InsightWidget } from "@/app/types/chat";
import ChartIcon from "./ChartIcon";
import ChartWidget from "@/app/components/widgets/ChartWidget";
import WidgetErrorBoundary from "@/app/components/widgets/WidgetErrorBoundary";
import { WidgetIcons } from "@/app/ChatPanelHeader";
import MetadataChips from "./MetadataChips";

type Props = {
  insight: PinnedInsight;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  isSeed?: boolean;
  onRemove?: () => void;
  size?: BlockSize;
  onResize?: (size: BlockSize) => void;
  // Optional one-click "Add map of this AOI". Wired by report/dashboard
  // pages — calls addMapBlock(workspaceId, insight.aoi) directly.
  onAddMap?: () => void;
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

// Mirrors the chat's WidgetMessage chrome (blue border, LCLGradientLight
// header, WidgetIcons icon + title). Renders at its natural height so it
// can sit inside the page-style sortable list without clipping.
export default function InsightBlock({
  insight,
  dragHandleProps,
  isSeed = false,
  onRemove,
  size = "default",
  onResize,
  onAddMap,
}: Props) {
  const isWide = size === "wide";
  const widget = useMemo(() => toInsightWidget(insight), [insight]);
  const hasData =
    Array.isArray(insight.data) && (insight.data as unknown[]).length > 0;

  return (
    <Box
      rounded="md"
      border="1px solid"
      borderColor={isSeed ? "green.fg" : "blue.fg"}
      overflow="hidden"
      bg="bg"
    >
      <Flex
        px={3}
        py={2}
        gap={2}
        bgGradient="LCLGradientLight"
        align="center"
        flexShrink={0}
      >
        <Box color="primary.fg" flexShrink={0} fontSize="md" lineHeight="1">
          {WidgetIcons[widget.type] ?? WidgetIcons.bar}
        </Box>
        <Box minW={0} flex="1">
          <Heading
            size="xs"
            fontWeight="medium"
            color="primary.fg"
            m={0}
            truncate
          >
            {insight.title}
          </Heading>
        </Box>
        <Flex gap={0.5} align="center" flexShrink={0}>
          {isSeed && (
            <Badge size="xs" colorPalette="green" variant="subtle" mr={1}>
              Seed
            </Badge>
          )}
          {onAddMap && (
            <IconButton
              aria-label="Add map of this AOI"
              size="2xs"
              variant="ghost"
              color="green.fg"
              onClick={onAddMap}
              title="Add map of this AOI"
            >
              <MapPinPlusIcon size={12} />
            </IconButton>
          )}
          {onResize && (
            <IconButton
              aria-label={
                isWide ? "Shrink to half width" : "Expand to full width"
              }
              size="2xs"
              variant="ghost"
              onClick={() => onResize(isWide ? "default" : "wide")}
              title={
                isWide ? "Shrink to half width" : "Expand to full width"
              }
            >
              {isWide ? (
                <ArrowsInLineHorizontalIcon size={12} />
              ) : (
                <ArrowsOutLineHorizontalIcon size={12} />
              )}
            </IconButton>
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
              display="flex"
              alignItems="center"
            >
              <DotsSixVerticalIcon size={14} />
            </Box>
          )}
        </Flex>
      </Flex>
      <Separator />
      <Box px={3} pt={2} pb={1}>
        <MetadataChips insight={insight} />
      </Box>
      <Box px={3} pb={3}>
        {hasData ? (
          <WidgetErrorBoundary fallbackTitle="Unable to render chart">
            <ChartWidget widget={widget} />
          </WidgetErrorBoundary>
        ) : (
          <Flex
            h="160px"
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
