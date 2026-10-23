import { Flex, Skeleton } from "@chakra-ui/react";

import { CARD_BODY_PROPS, CARD_FRAME_PROPS } from "./cardFrame";

/**
 * A `DashboardCard` while the list or its alerts load: the same frame, with
 * bars where the area, title, updated line and badge will be, so the reveal
 * swaps contents without moving anything.
 */
export default function DashboardCardSkeleton() {
  return (
    <Flex
      data-testid="dashboard-card-skeleton"
      {...CARD_FRAME_PROPS}
      {...CARD_BODY_PROPS}
    >
      <Skeleton h="16px" w="50%" />
      <Skeleton h="22px" w="85%" />
      <Skeleton h="22px" w="60%" />
      <Skeleton h="14px" w="40%" />
      <Skeleton mt="auto" h="24px" w="76px" />
    </Flex>
  );
}
