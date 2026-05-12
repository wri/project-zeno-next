"use client";

import {
  Box,
  Flex,
  Heading,
  IconButton,
  Separator,
  Text,
  Badge,
} from "@chakra-ui/react";
import {
  DotsSixVerticalIcon,
  XIcon,
  ArrowsOutLineHorizontalIcon,
  ArrowsInLineHorizontalIcon,
  MapPinIcon,
} from "@phosphor-icons/react";
import type { BlockSize, PinnedAoi } from "@/app/types/portfolio";
import MapCard from "./MapCard";

type Props = {
  aoi: PinnedAoi;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  onRemove?: () => void;
  size?: BlockSize;
  onResize?: (size: BlockSize) => void;
};

// Wraps MapCard in the same chrome as InsightBlock so map blocks read
// as peers of insights on a report or dashboard sheet.
export default function MapBlock({
  aoi,
  dragHandleProps,
  onRemove,
  size = "default",
  onResize,
}: Props) {
  const isWide = size === "wide";
  return (
    <Box
      rounded="md"
      border="1px solid"
      borderColor="green.fg"
      overflow="hidden"
      bg="bg"
    >
      <Flex
        px={3}
        py={2}
        gap={2}
        bg="green.subtle"
        align="center"
        flexShrink={0}
      >
        <Box color="green.fg" flexShrink={0} fontSize="md" lineHeight="1">
          <MapPinIcon />
        </Box>
        <Box minW={0} flex="1">
          <Heading
            size="xs"
            fontWeight="medium"
            color="green.fg"
            m={0}
            truncate
          >
            {aoi.name}
          </Heading>
          <Text fontSize="2xs" color="fg.muted" lineHeight="short" truncate>
            {aoi.isMultiArea ? `${aoi.src_ids.length} areas` : "Area"} ·{" "}
            {aoi.source}
            {!aoi.geometry && !aoi.bbox && " · no location data"}
          </Text>
        </Box>
        <Flex gap={0.5} align="center" flexShrink={0}>
          {aoi.isMultiArea && (
            <Badge size="xs" colorPalette="orange" variant="subtle" mr={1}>
              Multi-area
            </Badge>
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
              aria-label="Remove map block"
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
      <Box px={3} py={3}>
        <MapCard aoi={aoi} height={isWide ? 320 : 200} bare />
      </Box>
    </Box>
  );
}
