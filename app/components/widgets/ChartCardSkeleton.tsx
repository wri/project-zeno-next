"use client";

import { Box, Flex, Skeleton } from "@chakra-ui/react";

/**
 * Lightens Chakra's skeleton tiling to the neutral palette: the default
 * bg.muted → bg.emphasized gradient reads too dark against a white card.
 * Spread into the `css` prop of the container that holds the skeletons.
 */
export const skeletonToneCss = {
  "& .chakra-skeleton": {
    "--start-color": "colors.neutral.200",
    "--end-color": "colors.neutral.300",
  },
} as const;

/**
 * Placeholder for the body of a chart card while its analysis is still being
 * produced: the `WidgetMessage` toolbar (segmented Chart/Table toggle plus a
 * full-screen button), the divider, and the chart area. Shared by the map's
 * insight workspace and the dashboard grid so a pending analysis looks the
 * same wherever it is about to land. The caller supplies the frame (title,
 * summary, actions) that differs between surfaces.
 */
export function ChartCardSkeleton({
  chartHeight = "320px",
  withToolbar = true,
}: {
  chartHeight?: string;
  withToolbar?: boolean;
}) {
  return (
    <>
      {withToolbar && (
        <Flex px={4} pb={3} gap={3} align="center">
          <Flex gap={0}>
            <Skeleton h="24px" w="64px" roundedLeft="md" />
            <Skeleton h="24px" w="64px" roundedRight="md" />
          </Flex>
          <Skeleton h="24px" w="150px" rounded="md" />
        </Flex>
      )}

      <Box borderTop="1px solid" borderColor="#DDE2F5" />

      <Box px={4} py={3}>
        <Skeleton
          h={chartHeight}
          w="100%"
          rounded="md"
          data-testid="chart-card-skeleton"
        />
      </Box>
    </>
  );
}
