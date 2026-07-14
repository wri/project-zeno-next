"use client";

import { Drawer, Portal } from "@chakra-ui/react";

import { Sidebar } from "@/app/sidebar";
import useSidebarStore from "@/app/store/sidebarStore";

/**
 * The conversation-history sidebar in a left drawer, driven by
 * `sidebarStore.sideBarVisible` (the PageHeader clock icon toggles it).
 * The header renders that button on every surface, so every surface must
 * mount this drawer — otherwise the click silently flips an invisible flag.
 * Extracted from the map layout so the dashboard pages can mount it too.
 */
export default function ConversationHistoryDrawer() {
  const { sideBarVisible, toggleSidebar } = useSidebarStore();
  return (
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
  );
}
