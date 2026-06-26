"use client";

import { useEffect } from "react";
import { Box, Flex } from "@chakra-ui/react";
import DashboardHeader from "@/app/dashboards/components/DashboardHeader";
import DashboardChatDock from "@/app/dashboards/components/DashboardChatDock";
import useDashboardStore from "@/app/store/dashboardStore";

// Prototype layout: header on top, full-width dashboard content, and the chat
// dock as an overlay — a floating, draggable card by default that expands to a
// full-screen double pane (context panel + chat) when an area/analysis view is
// open. Mirrors the main app's floating panel over the map.
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
      {/* Relative wrapper: content scrolls; the dock overlays it (absolute). */}
      <Box flex="1 1 auto" minH={0} position="relative" overflow="hidden">
        <Box h="100%" overflowY="auto" bg="bg.subtle">
          {children}
        </Box>
        <DashboardChatDock />
      </Box>
    </Flex>
  );
}
