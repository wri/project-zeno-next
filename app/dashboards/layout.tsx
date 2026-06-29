"use client";

import { useEffect } from "react";
import { Flex } from "@chakra-ui/react";
import DashboardHeader from "@/app/dashboards/components/DashboardHeader";
import DashboardWorkspace from "@/app/dashboards/components/DashboardWorkspace";
import useDashboardStore from "@/app/store/dashboardStore";

// Prototype layout: header on top, then the workspace — full-width dashboard
// content with an independent docked side panel (Areas / Analysis / Data
// Catalogue) and a floating AI chat that can be full-sized (docked left of the
// side panel). Mirrors the main app's floating panel over the map.
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
      <DashboardWorkspace>{children}</DashboardWorkspace>
    </Flex>
  );
}
