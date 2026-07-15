"use client";

import {
  Box,
  Grid,
  Drawer,
  Portal,
  IconButton,
  useBreakpointValue,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";

import ChatPanel from "@/app/ChatPanel";
import ConversationHistoryDrawer from "@/app/components/ConversationHistoryDrawer";
import UploadAreaDialog from "@/app/components/UploadAreaDialog";
import Map from "@/app/components/Map";
import CatalogPanel from "@/app/components/CatalogPanel";
import AreasPanel from "@/app/components/AreasPanel";
import { InsightsPanel } from "@/src/features/insights-history";
import { Sidebar } from "@/app/sidebar";
import PageHeader from "@/app/components/PageHeader";
import SystemBanner from "@/app/components/SystemBanner";
import WhatsNewModal from "@/app/components/WhatsNewModal";
import { useAuthGuard } from "@/app/hooks/useAuthGuard";
import DraggableBottomSheet from "@/app/components/BottomSheet";
import { ListIcon } from "@phosphor-icons/react";
import useSidebarStore from "@/app/store/sidebarStore";
import useAgentProfileStore from "@/app/store/agentProfileStore";
import useViewContextStore from "@/app/store/viewContextStore";
import MapAreaFeedback from "@/app/components/MapAreaFeedback";
import { AnalysisCtaTrigger } from "@/app/lib/analysis/AnalysisCtaTrigger";
import {
  CATALOG_COLUMN_Z_INDEX,
  MAP_FEEDBACK_Z_INDEX,
} from "@/app/explorationLayout";
import { ViewAnalysisTrigger } from "@/src/features/analysis";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isReady = useAuthGuard();
  const [sheetHeight, setSheetHeight] = useState(400);
  const { toggleSidebar } = useSidebarStore();
  const isMobile = useBreakpointValue({ base: true, md: false });
  const [mobileHeight, setMobileHeight] = useState("0");

  useEffect(() => {
    // Set layout heights after mount to avoid flash of both layouts at once
    setMobileHeight("min(100dvh, 100vh)");
  }, []);

  useEffect(() => {
    // Capture ?agent_profile once on mount. The chat replaces the URL with
    // /app/threads/:id after the first message, so the param must be persisted
    // rather than re-read from the live URL on each request.
    useAgentProfileStore.getState().initFromUrl();
    // Report this surface to the agent on every chat request from here on.
    useViewContextStore.getState().setViewContext({ page: "map" });
  }, []);

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
        top={0}
        bottom={0}
        left={0}
        zIndex={CATALOG_COLUMN_Z_INDEX}
        pointerEvents="none"
        display={{ base: "none", md: "block" }}
      >
        <CatalogPanel />
        <AreasPanel />
        <InsightsPanel />
      </Box>
      <Box
        position="absolute"
        top={0}
        bottom={0}
        left={0}
        right={0}
        zIndex={MAP_FEEDBACK_Z_INDEX}
        pointerEvents="none"
        display={{ base: "none", md: "block" }}
      >
        <MapAreaFeedback />
      </Box>
      <Box
        position="absolute"
        top={0}
        bottom={0}
        left={0}
        zIndex={1100}
        display="flex"
        flexDir="column"
        pointerEvents="none"
      >
        <Box
          pointerEvents="none"
          minH={0}
          display="flex"
          flexDir="column"
          h="100%"
        >
          <ChatPanel />
        </Box>
      </Box>
      <ConversationHistoryDrawer />
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
          maxW="calc(100% - 4.5rem)"
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
      <WhatsNewModal />
      <AnalysisCtaTrigger />
      <ViewAnalysisTrigger />

      {!isMobile && (
        <Box>
          <PageHeader />
          {/* Rebrand announcement sits full-width directly below the header and
              supersedes the preview DisclaimerPanel while it is showing.
              Desktop-only by design: it lives in the desktop header cell and
              replaces the desktop-only DisclaimerPanel, leaving the mobile
              bottom-sheet layout untouched. */}
          <SystemBanner dismissible />
        </Box>
      )}
      {isMobile ? MobileLayout : DesktopLayout}

      {children}
    </Grid>
  );
}
