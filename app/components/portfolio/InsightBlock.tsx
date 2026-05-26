"use client";

import { useMemo } from "react";
import { Box, Flex, Text, Heading, IconButton, Badge } from "@chakra-ui/react";
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
import { WidgetIconComponent } from "@/app/utils/widgetIcons";
import { Tooltip } from "@/app/components/ui/tooltip";
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

// PinnedInsight narrows the chart type to a subset of InsightWidget["type"],
// so this is a safe upcast for ChartWidget rendering.
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

const AI_DISCLAIMER =
  "This visualization includes AI-generated charts and data summaries. AI models may produce incomplete or incorrect information. Please verify all outputs before using them in your work.";

// Mirrors the disclaimer tooltip used by app/components/InsightWorkspace.tsx.
// Kept inline here so portfolio blocks render the same hover affordance
// without coupling the prototype to the chat workspace component.
const aiDisclaimerTooltip = (
  <Box display="flex" flexDirection="column" gap="2px" maxW="296px">
    <Text
      fontFamily="body"
      fontSize="12px"
      lineHeight="150%"
      fontWeight="medium"
      color="#FFFFFF"
    >
      AI-ASSISTED ANALYSIS
    </Text>
    <Text
      fontFamily="body"
      fontSize="12px"
      lineHeight="150%"
      fontWeight="normal"
      color="#B2B6BD"
    >
      {AI_DISCLAIMER}
    </Text>
  </Box>
);

// Visual chrome matches the chat-side InsightWorkspace card (header tag,
// title row, optional chips, body) so reports/dashboards feel native
// alongside live chat insights.
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
  const HeaderIcon = WidgetIconComponent[widget.type];

  return (
    <Box
      bg="primary.25"
      border="1px solid"
      borderColor={isSeed ? "green.fg" : "#DDE2F5"}
      rounded="4px"
      overflow="hidden"
      display="flex"
      flexDirection="column"
    >
      {/* Header — AI-ASSISTED tag + block-specific controls */}
      <Flex
        h="28px"
        px="16px"
        py="6px"
        gap="8px"
        justify="space-between"
        align="center"
        borderBottom="1px solid"
        borderColor="#DDE2F5"
      >
        <Flex
          align="center"
          gap="8px"
          h="16px"
          flexWrap="nowrap"
          overflow="hidden"
          flex={1}
          minW={0}
        >
          <HeaderIcon size={12} color="#0049AA" />
          <Text
            fontSize="10px"
            fontFamily="mono"
            fontWeight="normal"
            lineHeight="16px"
            letterSpacing="0.03em"
            color="fg.muted"
            whiteSpace="nowrap"
            overflow="hidden"
            textOverflow="ellipsis"
          >
            AI-ASSISTED ANALYSIS
            {" · "}
            <Tooltip
              variant="dark"
              content={aiDisclaimerTooltip}
              showArrow
              positioning={{ placement: "bottom" }}
              openDelay={100}
              closeDelay={100}
            >
              <Box
                as="span"
                color="#4A64CB"
                textDecoration="underline"
                cursor="help"
                tabIndex={0}
                aria-label="Learn more about AI-Assisted Analysis"
              >
                learn more
              </Box>
            </Tooltip>
          </Text>
        </Flex>
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

      {/* Title row */}
      <Flex
        px={4}
        py={1}
        justify="space-between"
        align="flex-start"
        borderBottom="1px solid"
        borderColor="#DDE2F5"
      >
        <Heading
          size="sm"
          fontWeight="semibold"
          color="primary.fg"
          flex={1}
          mr={2}
          mb={0}
        >
          {insight.title}
        </Heading>
      </Flex>

      {/* Metadata chips section */}
      <Box px={4} py={2} borderBottom="1px solid" borderColor="#DDE2F5">
        <MetadataChips insight={insight} />
      </Box>

      {/* Chart body */}
      <Box px={2} py={2} bg="bg">
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
