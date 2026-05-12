"use client";

import { Box, Flex, IconButton, Text, Badge } from "@chakra-ui/react";
import { DotsSixVerticalIcon, XIcon } from "@phosphor-icons/react";
import type { PinnedInsight } from "@/app/types/portfolio";
import ChartIcon from "./ChartIcon";

type Props = {
  insight: PinnedInsight;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  isSeed?: boolean;
  onRemove?: () => void;
};

// A compact, fixed-height canvas block representing an insight.
// Used by both Report Canvas and Area Dashboard grids.
export default function InsightBlock({
  insight,
  dragHandleProps,
  isSeed = false,
  onRemove,
}: Props) {
  const colorPalette = isSeed ? "green" : "primary";
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
      h="160px"
      overflow="hidden"
      display="flex"
      flexDir="column"
    >
      <Flex justify="space-between" align="flex-start" gap={2} mb={1}>
        <ChartIcon
          type={insight.chartType}
          size={20}
          color={`var(--chakra-colors-${colorPalette}-fg)`}
        />
        <Flex gap={1} align="center">
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
      <Box
        mt="auto"
        bg="bg.subtle"
        rounded="sm"
        h="40px"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <ChartIcon
          type={insight.chartType}
          size={60}
          color={`var(--chakra-colors-${colorPalette}-fg)`}
        />
      </Box>
    </Box>
  );
}
