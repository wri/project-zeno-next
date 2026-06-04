"use client";

import {
  Box,
  Grid,
  Drawer,
  Portal,
  IconButton,
  useBreakpointValue,
} from "@chakra-ui/react";
import { Suspense, useEffect, useState } from "react";

import ChatPanel from "@/app/ChatPanel";
import UploadAreaDialog from "@/app/components/UploadAreaDialog";
import Map from "@/app/components/Map";
import { Sidebar } from "@/app/sidebar";
import PageHeader from "@/app/components/PageHeader";
import DebugToastsPanel from "@/app/components/DebugToastsPanel";
import { useAuthGuard } from "@/app/hooks/useAuthGuard";
import { useSearchParams } from "next/navigation";
import DraggableBottomSheet from "@/app/components/BottomSheet";
import { ListIcon } from "@phosphor-icons/react";
import useSidebarStore from "@/app/store/sidebarStore";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isReady = useAuthGuard();
  const [sheetHeight, setSheetHeight] = useState(400);
  const { toggleSidebar, sideBarVisible } = useSidebarStore();
  const isMobile = useBreakpointValue({ base: true, md: false });
  const [mobileHeight, setMobileHeight] = useState("0");

  useEffect(() => {
    // Set layout heights after mount to avoid flash of both layouts at once
    setMobileHeight("min(100dvh, 100vh)");
  }, []);

  function DebugToastsMount() {
    const params = useSearchParams();
    const debugEnabled =
      process.env.NEXT_PUBLIC_ENABLE_DEBUG_TOOLS === "true" ||
      params.get("debug") === "1";
    return <DebugToastsPanel enabled={debugEnabled} />;
  }

  const DesktopLayout = (
    <Box
      position="relative"
      w="100vw"
      h="100%"
      overflow="hidden"
      display={{ base: "none", md: "block" }}
    >
      <Map />
      <Box
        position="absolute"
        top={2}
        bottom={1}
        left={2}
        zIndex={1100}
        display="flex"
        flexDir="column"
        justifyContent="flex-end"
        gap={0}
        pointerEvents="none"
      >
        <Box pointerEvents="auto" minH={0} display="flex" flexDir="column">
          <ChatPanel />
        </Box>
        {/* Frosted-glass disclaimer — unconstrained width, 16px below cards */}
        <Box
          pointerEvents="auto"
          px={2}
          py={1}
          mt={4}
          borderRadius="sm"
          backdropFilter="blur(24px)"
          bg="whiteAlpha.200"
          fontSize="10px"
          lineHeight="20px"
          color="#131619"
          opacity={0.5}
          whiteSpace="nowrap"
        >
          AI makes mistakes. Verify outputs and do not share any sensitive or
          personal information.
        </Box>
      </Box>
      <Drawer.Root
        placement="start"
        open={sideBarVisible}
        onOpenChange={(e) => {
          if (!e.open) toggleSidebar();
        }}
      >
        <Portal>
          <Drawer.Backdrop backdropFilter="blur(2px)" />
          <Drawer.Positioner>
            <Drawer.Content maxW="16rem" w="16rem">
              <Sidebar />
            </Drawer.Content>
          </Drawer.Positioner>
        </Portal>
      </Drawer.Root>
    </Box>
  );

  const MobileLayout = (
    <Box
      position="relative"
      w="100vw"
      h={{ base: mobileHeight, md: 0 }}
      overflow="hidden"
      gridRow={{ base: 1, md: "none" }}
      display={{ base: "block", md: "none" }}
    >
      <Box
        w="100%"
        h={`calc(100% - ${sheetHeight}px + 12px)`}
        transition="height 0.05s linear"
      >
        <Drawer.Root placement="start">
          <Drawer.Trigger asChild>
            <IconButton
              variant="plain"
              bg="bg"
              position="absolute"
              top={3}
              left={3}
              rounded="sm"
              overflow="hidden"
              zIndex={100}
              onClick={toggleSidebar}
            >
              <ListIcon />
            </IconButton>
          </Drawer.Trigger>
          <Portal>
            <Drawer.Backdrop backdropFilter="blur(2px)" />
            <Drawer.Positioner>
              <Drawer.Content>
                <Sidebar />
              </Drawer.Content>
            </Drawer.Positioner>
          </Portal>
        </Drawer.Root>
        <Box
          position="absolute"
          top={3}
          left={"3.75rem"}
          rounded="sm"
          overflow="hidden"
          zIndex={100}
        >
          <PageHeader />
        </Box>
        <Map />
      </Box>
      <DraggableBottomSheet onHeightChange={setSheetHeight}>
        <ChatPanel />
      </DraggableBottomSheet>
    </Box>
  );

  if (!isReady) return null;

  return (
    <Grid
      maxH="min(100dvh, 100vh)"
      h="min(100dvh, 100vh)"
      templateRows={{ base: "1fr", md: "min-content minmax(0px, 1fr)" }}
      bg="bg"
    >
      <UploadAreaDialog />

      {!isMobile && <PageHeader />}
      {isMobile ? MobileLayout : DesktopLayout}

      <Suspense fallback={null}>
        <DebugToastsMount />
      </Suspense>
      {children}
    </Grid>
  );
}
