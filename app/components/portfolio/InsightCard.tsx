"use client";

import {
  Box,
  Flex,
  HStack,
  Text,
  Checkbox,
  Badge,
  Button,
} from "@chakra-ui/react";
import { formatDistanceToNow } from "date-fns";
import type { PinnedInsight } from "@/app/types/portfolio";
import ChartIcon from "./ChartIcon";

type Variant = "default" | "compact";

type Props = {
  insight: PinnedInsight;
  selected?: boolean;
  onSelectChange?: (selected: boolean) => void;
  onSeedDashboard?: () => void;
  onPinToCanvas?: () => void;
  onViewSource?: () => void;
  variant?: Variant;
  // When variant="compact", we hide checkbox and large meta — used by the
  // Report Canvas left-hand inbox pane and by the AddToReportDialog list.
  pinDisabled?: boolean;
};

function relativeTime(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return "";
  }
}

export default function InsightCard({
  insight,
  selected = false,
  onSelectChange,
  onSeedDashboard,
  onPinToCanvas,
  onViewSource,
  variant = "default",
  pinDisabled = false,
}: Props) {
  const compact = variant === "compact";
  const aoiLabel = insight.aoi.isMultiArea
    ? `Multi-area · ${insight.aoi.src_ids.length} areas`
    : insight.aoi.name;

  return (
    <Box
      bg="bg"
      border="1px solid"
      borderColor={selected ? "primary.solid" : "border"}
      rounded="md"
      px={compact ? 3 : 4}
      py={compact ? 2.5 : 3}
      transition="border-color 0.12s, background 0.12s"
      _hover={{ borderColor: selected ? "primary.solid" : "border.emphasized" }}
    >
      <Flex align="flex-start" gap={3}>
        {!compact && onSelectChange && (
          <Checkbox.Root
            checked={selected}
            onCheckedChange={(e) => onSelectChange(Boolean(e.checked))}
            mt={1}
          >
            <Checkbox.HiddenInput />
            <Checkbox.Control />
          </Checkbox.Root>
        )}
        <Box flex="1" minW={0}>
          <Flex justify="space-between" gap={2} align="flex-start">
            <Text
              fontSize={compact ? "xs" : "sm"}
              fontWeight="semibold"
              color="fg"
              lineHeight="short"
            >
              {insight.title}
            </Text>
            <Box color="primary.fg" opacity={0.75} mt={0.5}>
              <ChartIcon
                type={insight.chartType}
                size={compact ? 16 : 20}
                color="currentColor"
              />
            </Box>
          </Flex>
          <Text
            fontSize="xs"
            color="fg.muted"
            mt={1}
            lineHeight="short"
            truncate
          >
            {insight.datasetName ? `${insight.datasetName} · ` : ""}
            {aoiLabel}
            {!compact && ` · ${relativeTime(insight.pinnedAt)}`}
          </Text>
          {!compact && insight.aoi.isMultiArea && (
            <Badge
              variant="subtle"
              colorPalette="orange"
              fontSize="2xs"
              mt={1.5}
            >
              Multi-area
            </Badge>
          )}
          <HStack gap={3} mt={compact ? 1.5 : 2} fontSize="xs">
            {!compact && (
              <Button
                size="2xs"
                variant="plain"
                color="primary.fg"
                px={0}
                h="auto"
                fontWeight="medium"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewSource?.();
                }}
              >
                ↗ View source
              </Button>
            )}
            {!compact && onSeedDashboard && (
              <Button
                size="2xs"
                variant="plain"
                color="green.fg"
                px={0}
                h="auto"
                fontWeight="medium"
                onClick={(e) => {
                  e.stopPropagation();
                  onSeedDashboard();
                }}
              >
                ⊕ Seed area dashboard
              </Button>
            )}
            {compact && onPinToCanvas && (
              <Button
                size="2xs"
                variant="plain"
                color="primary.fg"
                px={0}
                h="auto"
                fontWeight="medium"
                disabled={pinDisabled}
                onClick={(e) => {
                  e.stopPropagation();
                  onPinToCanvas();
                }}
              >
                {pinDisabled ? "✓ On canvas" : "+ Pin to canvas"}
              </Button>
            )}
          </HStack>
        </Box>
      </Flex>
    </Box>
  );
}
