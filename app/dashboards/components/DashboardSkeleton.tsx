"use client";

import { Box, Flex, Grid } from "@chakra-ui/react";

// Skeleton shown in the dashboard content column while a new dashboard is
// "loading" / awaiting an area (Rectangle 147752 in the design: a white card
// with an 8px radius and a 1px rgba(19,22,25,0.1) border — the same chrome the
// real content card uses, so the skeleton settles into the real layout without
// a jump). Placeholder blocks shimmer using the theme's `shimmer` animation.

/** A single shimmering placeholder block: a light-grey base with one soft,
 *  angled white band swept across it. The band is an absolutely-positioned
 *  overlay translated with `shimmerSweep` (a single pass per cycle), so there's
 *  no double-band artefact that the background-position approach produced. */
function Shimmer(props: React.ComponentProps<typeof Box>) {
  return (
    <Box
      rounded="4px"
      bgColor="#E6E9ED"
      position="relative"
      overflow="hidden"
      {...props}
    >
      <Box
        position="absolute"
        inset={0}
        backgroundImage="linear-gradient(115deg, rgba(255,255,255,0) 35%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0) 65%)"
        animation="shimmerSweep 3s ease-in-out infinite"
      />
    </Box>
  );
}

// Body-only placeholder: skeleton "tabs" row + a 2×2 grid of widget tiles. Used
// on its own under a real (titled) dashboard header during the template step,
// once an area is chosen but no analyses have been added yet (Figma flow 3).
export function SkeletonTiles() {
  return (
    <>
      <Flex gap={3} mb={6}>
        <Shimmer h="12px" w="120px" />
        <Shimmer h="12px" w="120px" />
        <Shimmer h="12px" w="120px" />
      </Flex>
      <Grid templateColumns={{ base: "1fr", lg: "repeat(2, 1fr)" }} gap={4}>
        <Shimmer h="260px" />
        <Shimmer h="260px" />
        <Shimmer h="220px" />
        <Shimmer h="220px" />
      </Grid>
    </>
  );
}

export default function DashboardSkeleton() {
  return (
    <Box
      bg="#FFFFFF"
      borderRadius="8px"
      borderWidth="1px"
      borderColor="rgba(19, 22, 25, 0.1)"
      overflow="hidden"
    >
      {/* Header zone — eyebrow, title, action buttons */}
      <Box
        bgColor="#FFFFFF"
        bgImage="url('/dashboard-header-bg.svg')"
        bgSize="cover"
        bgPos="top"
        bgRepeat="no-repeat"
        px={{ base: 5, md: 8 }}
        pt={{ base: 5, md: 8 }}
        pb={6}
      >
        <Shimmer h="14px" w="120px" mb={3} />
        <Flex
          justify="space-between"
          align="flex-start"
          gap={4}
          flexWrap="wrap"
        >
          <Box minW={0}>
            <Shimmer h="30px" w="320px" maxW="100%" mb={3} />
            <Shimmer h="10px" w="160px" />
          </Box>
          <Flex gap={3} flexShrink={0}>
            <Shimmer h="24px" w="140px" />
            <Shimmer h="24px" w="84px" />
            <Shimmer h="24px" w="84px" />
          </Flex>
        </Flex>
      </Box>

      {/* Body — placeholder widget tiles */}
      <Box px={{ base: 5, md: 8 }} py={{ base: 5, md: 8 }}>
        <Grid templateColumns={{ base: "1fr", lg: "repeat(2, 1fr)" }} gap={4}>
          <Shimmer h="260px" />
          <Shimmer h="260px" />
          <Shimmer h="220px" />
          <Shimmer h="220px" />
        </Grid>
      </Box>
    </Box>
  );
}
