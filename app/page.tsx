"use client";

import Map from "@/app/components/Map";
import { Box, Flex, Grid, Heading } from "@chakra-ui/react";
import { Sidebar } from "./sidebar";
import ChatPanel from "./ChatPanel";
import LclLogo from "./components/LclLogo";
import LoginOverlay from "./components/LoginOverlay";
import UploadAreaDialog from "./components/UploadAreaDialog";
import useChatStore from "./store/chatStore";
import useMapStore from "./store/mapStore";
import useContextStore from "./store/contextStore";
import { useEffect } from "react";

import WelcomeModal from "./components/WelcomeModal";

export default function Home() {
  const { reset: resetChatStore } = useChatStore();
  const { reset: resetMapStore } = useMapStore();
  const { reset: resetContextStore } = useContextStore();

  useEffect(() => {
    resetChatStore();
    resetMapStore();
    resetContextStore();
  }, [resetChatStore, resetMapStore, resetContextStore]);

  return (
    <Grid
      maxH="100vh"
      h="100vh"
      templateRows="min-content minmax(0px, 1fr)"
      bg="bg"
    >
      {/* <LoginOverlay /> LoginOverlay was causing WelcomeModal to close */}
      <WelcomeModal />
      <UploadAreaDialog />
      <Flex
        alignItems="center"
        justifyContent="space-between"
        px="5"
        py="2"
        h="12"
        bg="blue.700"
        color="fg.inverted"
      >
        <Flex gap="2">
          <LclLogo width={16} avatarOnly />
          <Heading size="md" as="h1">
            Zeno
          </Heading>
        </Flex>
      </Flex>
      <Grid
        templateColumns="auto 36rem 1fr"
        templateAreas="'sidebar chat map'"
        templateRows="1fr"
        maxH="calc(100vh - 3rem)"
      >
        <Sidebar />
        <ChatPanel />
        <Grid templateRows="1fr" gridArea="map">
          <Box overflow="hidden" position="relative">
            <Map />
          </Box>
        </Grid>
      </Grid>
    </Grid>
  );
}
