"use client";

import { Box, Flex, Skeleton, Text } from "@chakra-ui/react";
import { SpinnerGapIcon } from "@phosphor-icons/react";

import {
  ChartCardSkeleton,
  skeletonToneCss,
} from "@/app/components/widgets/ChartCardSkeleton";
import type { PendingInsightWidget } from "../model/pending-insight-widgets-store";

/**
 * The loading counterpart of an insight widget: the same light-blue
 * `DashboardWidgetCard` shell, with the module title already known in the
 * header (a running caption where the owner actions sit), the params row and
 * white chart card as skeletons, and, when the analysis is expected to yield
 * several charts, a pager-shaped footer like the real card's. Appears at the
 * end of the ungrouped container the moment a curated analysis is toggled on
 * and is replaced by the real widget when the dashboard refetch lands. No
 * owner actions and no drag identity: there is nothing to arrange or remove
 * yet, and the grid's drag hit-test must never see it.
 */
export default function DashboardPendingInsightCard({
  pending,
  isOwner,
}: {
  pending: PendingInsightWidget;
  /** Keeps the title aligned with real cards, which reserve room for the drag handle. */
  isOwner: boolean;
}) {
  return (
    <Flex
      flexDir="column"
      bg="#F7F9FF"
      borderWidth="1px"
      borderColor="#DDE2F5"
      borderRadius="sm"
      overflow="hidden"
      css={skeletonToneCss}
      role="status"
      aria-busy="true"
      aria-label={`Running ${pending.title}`}
      data-testid="pending-insight-card"
    >
      {/* Header — mirrors DashboardWidgetCard: handle slot · title · actions */}
      <Flex align="center" gap="4px" pl="4px" pr="12px" pt="12px" pb="8px">
        {isOwner && <Box boxSize="16px" flexShrink={0} />}
        <Text
          flex="1"
          minW={0}
          fontSize="14px"
          fontWeight="medium"
          lineHeight="16px"
          color="#172B7A"
          wordBreak="break-word"
          pl={isOwner ? 0 : "8px"}
        >
          {pending.title}
        </Text>
        <Flex align="center" gap="4px" flexShrink={0} color="fg.muted">
          <Box
            display="flex"
            alignItems="center"
            animation="spin 1s infinite"
            animationTimingFunction="steps(8, end)"
            aria-hidden
          >
            <SpinnerGapIcon size={14} />
          </Box>
          <Text
            fontSize="10px"
            fontFamily="mono"
            lineHeight="16px"
            letterSpacing="0.03em"
            color="#656E7B"
            whiteSpace="nowrap"
          >
            RUNNING ANALYSIS
          </Text>
        </Flex>
      </Flex>

      {/* Params row placeholder — the "Show params" toggle a curated card carries */}
      <Box px="8px" pb="8px">
        <Flex
          borderTopWidth="1px"
          borderColor="rgba(19,22,25,0.05)"
          pt="4px"
          align="center"
        >
          <Skeleton h="12px" w="72px" rounded="sm" />
        </Flex>
      </Box>

      {/* The white chart card WidgetMessage renders inside the shell */}
      <Box px="8px" pb="8px" flex="1" minW={0}>
        <Box
          bg="white"
          borderWidth="1px"
          borderColor="#DDE2F5"
          borderRadius="sm"
          pt={3}
        >
          <ChartCardSkeleton />
        </Box>
      </Box>

      {pending.chartCountHint > 1 && (
        <Flex
          align="center"
          justify="space-between"
          px="12px"
          py="8px"
          borderTopWidth="1px"
          borderColor="rgba(19,22,25,0.05)"
        >
          <Skeleton boxSize="24px" rounded="md" />
          <Text
            fontSize="12px"
            color="fg.muted"
            css={{ fontVariantNumeric: "tabular-nums" }}
          >
            1 of {pending.chartCountHint} charts
          </Text>
          <Skeleton boxSize="24px" rounded="md" />
        </Flex>
      )}
    </Flex>
  );
}
