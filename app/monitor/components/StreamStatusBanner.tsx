"use client";

import { Box, Flex, HStack, Spinner, Text } from "@chakra-ui/react";
import {
  CheckCircleIcon,
  WarningCircleIcon,
  XCircleIcon,
} from "@phosphor-icons/react";

import { DATASETS } from "../constants/datasets";
import type { AggregateStatus, DatasetStreamState } from "../types/stream";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface StreamStatusBannerProps {
  streams: Map<number, DatasetStreamState>;
  aggregateStatus: AggregateStatus;
  aggregateMessage: string;
}

// ---------------------------------------------------------------------------
// Per-status visual config
// ---------------------------------------------------------------------------

const bannerConfig: Record<
  AggregateStatus,
  { bg: string; border: string; color: string }
> = {
  idle: { bg: "bg.subtle", border: "border", color: "fg.muted" },
  streaming: { bg: "bg.info", border: "border.info", color: "fg.info" },
  partial: { bg: "bg.warning", border: "border.warning", color: "fg.warning" },
  complete: { bg: "bg.success", border: "border.success", color: "fg.success" },
  error: { bg: "bg.error", border: "border.error", color: "fg.error" },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StreamStatusBanner({
  streams,
  aggregateStatus,
  aggregateMessage,
}: StreamStatusBannerProps) {
  const style = bannerConfig[aggregateStatus] ?? bannerConfig.idle;
  const entries = [...streams.entries()].sort(([a], [b]) => a - b);

  return (
    <Box
      px={4}
      py={3}
      rounded="md"
      bg={style.bg}
      border="1px solid"
      borderColor={style.border}
    >
      {/* Aggregate status line */}
      <HStack gap={2} mb={entries.length > 1 ? 2 : 0}>
        {aggregateStatus === "streaming" && (
          <Spinner size="xs" color={style.color} />
        )}
        {aggregateStatus === "complete" && (
          <CheckCircleIcon size={16} weight="fill" />
        )}
        {aggregateStatus === "error" && (
          <XCircleIcon size={16} weight="fill" />
        )}
        {aggregateStatus === "partial" && (
          <WarningCircleIcon size={16} weight="fill" />
        )}
        <Text fontSize="sm" fontWeight="medium" color={style.color}>
          {aggregateMessage}
        </Text>
      </HStack>

      {/* Per-dataset breakdown (only when multiple datasets) */}
      {entries.length > 1 && (
        <Flex flexWrap="wrap" gap={2} mt={1}>
          {entries.map(([id, state]) => {
            const name = DATASETS[id] ?? `Dataset ${id}`;
            const shortName =
              name.length > 30 ? name.slice(0, 28) + "…" : name;

            return (
              <HStack
                key={id}
                gap={1.5}
                px={2}
                py={0.5}
                rounded="sm"
                bg="bg.panel"
                border="1px solid"
                borderColor="border"
                fontSize="xs"
              >
                <DatasetStatusDot status={state.status} />
                <Text color="fg.muted" lineClamp={1}>
                  {shortName}
                </Text>
              </HStack>
            );
          })}
        </Flex>
      )}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Status dot
// ---------------------------------------------------------------------------

function DatasetStatusDot({ status }: { status: string }) {
  const color =
    status === "complete"
      ? "fg.success"
      : status === "error"
        ? "fg.error"
        : "fg.info";

  return (
    <Box w={2} h={2} rounded="full" bg={color} flexShrink={0} />
  );
}
