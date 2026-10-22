import { Flex, Skeleton } from "@chakra-ui/react";

import { HERO_GRID_IMAGE } from "./heroGrid";

/**
 * A `DashboardCard` while the list or its alerts load: the same frame, with
 * bars where the area, title, updated line and badge will be, so the reveal
 * swaps contents without moving anything.
 */
export default function DashboardCardSkeleton() {
  return (
    <Flex
      data-testid="dashboard-card-skeleton"
      direction="column"
      gap={2}
      minH="308px"
      p={5}
      pt="48px"
      bg="white"
      backgroundImage={HERO_GRID_IMAGE}
      borderWidth="1px"
      borderColor="border"
      borderTopWidth="2px"
      borderTopColor="primary.solid"
      borderRadius="sm"
    >
      <Skeleton h="16px" w="50%" />
      <Skeleton h="22px" w="85%" />
      <Skeleton h="22px" w="60%" />
      <Skeleton h="14px" w="40%" />
      <Skeleton mt="auto" h="24px" w="76px" />
    </Flex>
  );
}
