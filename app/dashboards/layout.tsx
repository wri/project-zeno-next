"use client";

import { Box, Drawer, Flex, Portal } from "@chakra-ui/react";
import PageHeader from "@/app/components/PageHeader";
import { Sidebar } from "@/app/sidebar";
import useSidebarStore from "@/app/store/sidebarStore";

// No auth guard here: public dashboards are viewable logged-out, so the
// detail page renders unguarded (the API returns 401 for private ones). The
// gallery and create pages guard themselves.
export default function DashboardsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { toggleSidebar, sideBarVisible } = useSidebarStore();

  return (
    <Flex direction="column" h="min(100dvh, 100vh)" bg="bg">
      <PageHeader />
      <Box flex="1" minH={0}>
        {children}
      </Box>
      {/* Conversation-history drawer, so the header's history button keeps
          working outside the explorer layout. */}
      <Drawer.Root
        placement="start"
        open={sideBarVisible}
        onOpenChange={(e) => {
          if (!e.open && sideBarVisible) toggleSidebar();
        }}
      >
        <Portal>
          <Drawer.Backdrop backdropFilter="blur(2px)" />
          <Drawer.Positioner>
            <Drawer.Content maxW="428px" w="428px">
              <Sidebar />
            </Drawer.Content>
          </Drawer.Positioner>
        </Portal>
      </Drawer.Root>
    </Flex>
  );
}
