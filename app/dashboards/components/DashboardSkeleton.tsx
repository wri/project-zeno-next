"use client";

import { Box, Flex, Grid } from "@chakra-ui/react";

// Skeleton shown in the dashboard content column while a new dashboard is
// "loading" / awaiting an area (Rectangle 147752 in the design: a white card
// with an 8px radius and a 1px rgba(19,22,25,0.1) border — the same chrome the
// real content card uses, so the skeleton settles into the real layout without
// a jump). Placeholder blocks shimmer using the theme's `shimmer` animation.

/** A single shimmering placeholder block. */
function Shimmer(props: React.ComponentProps<typeof Box>) {
  return (
    <Box
      rounded="4px"
      animation="shimmer"
      backgroundSize="200% 100%"
      // Light neutral sweep so the shimmer reads against the white card.
      background="linear-gradient(120deg, #EEF0F2 0%, #DCE0E4 50%, #EEF0F2 100%)"
      {...props}
    />
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
