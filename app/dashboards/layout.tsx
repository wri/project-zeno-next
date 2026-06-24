"use client";

import { useEffect } from "react";
import { Box, Flex } from "@chakra-ui/react";
import DashboardHeader from "@/app/dashboards/components/DashboardHeader";
import DashboardLeftDock from "@/app/dashboards/components/DashboardLeftDock";
import useDashboardStore from "@/app/store/dashboardStore";

// Prototype layout: header on top, the left dock (chat panel, with a slide-out
// Analyses list) docked on the left, and the dashboard content on the right —
// mirroring the main app's [panel | map] arrangement, with content for the map.
//
// Deliberately NOT behind useAuthGuard: this is a standalone prototype that
// should be clickable without a backend session.
export default function DashboardsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const hydrate = useDashboardStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <Flex direction="column" h="min(100dvh, 100vh)" bg="bg" overflow="hidden">
      <DashboardHeader />
      <Flex flex="1 1 auto" minH={0}>
        <Box display={{ base: "none", md: "block" }} h="100%" flexShrink={0}>
          <DashboardLeftDock />
        </Box>
        <Box flex="1 1 auto" minW={0} overflowY="auto" bg="bg.subtle">
          {children}
        </Box>
      </Flex>
    </Flex>
  );
}
