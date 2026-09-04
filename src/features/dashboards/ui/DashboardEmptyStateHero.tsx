"use client";

import { Box, Flex, Heading, Text } from "@chakra-ui/react";
import { PlusIcon } from "@phosphor-icons/react";

import type { Dashboard } from "../api/schemas";
import DashboardSuggestedModules from "./DashboardSuggestedModules";

/**
 * The dashboard's zero-widget state (Figma "Dashboard Empty state_No active
 * dataset", node 1472:4106) — a dashed hero panel inviting the owner to fill
 * the dashboard in, wrapping the same `DashboardSuggestedModules` row shown
 * once the dashboard has content. `DashboardDetailPage` swaps between this
 * and the widget grid on widget count, never both at once.
 */
export default function DashboardEmptyStateHero({
  dashboard,
  isOwner,
}: {
  dashboard: Dashboard;
  isOwner: boolean;
}) {
  return (
    <Flex
      direction="column"
      align="center"
      gap="32px"
      bg="#F7F9FF"
      borderWidth="1.5px"
      borderStyle="dashed"
      borderColor="#C2CCF2"
      borderRadius="sm"
      p="56px"
    >
      <Flex direction="column" align="center" gap="16px" textAlign="center">
        <Box color="#0049AA">
          <PlusIcon size={24} />
        </Box>
        <Flex direction="column" align="center" gap="8px">
          <Heading
            as="h2"
            fontSize="18px"
            lineHeight="28px"
            fontWeight="semibold"
            color="#0049AA"
            mb={0}
          >
            Your dashboard is ready
          </Heading>
          <Text fontSize="14px" lineHeight="20px" color="#565E7B">
            {`Let's fill it in with charts, maps, and insights you care about for ${dashboard.name}.`}
          </Text>
        </Flex>
      </Flex>
      <Box w="full">
        <DashboardSuggestedModules
          dashboard={dashboard}
          isOwner={isOwner}
          mt={0}
        />
      </Box>
    </Flex>
  );
}
