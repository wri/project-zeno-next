"use client";

import Map from "@/app/components/Map";
import { Box, Grid } from "@chakra-ui/react";
import { Sidebar } from "./sidebar";
import ChatPanel from "./ChatPanel";
import LoginOverlay from "./components/LoginOverlay";
import UploadAreaDialog from "./components/UploadAreaDialog";
import useChatStore from "./store/chatStore";
import useMapStore from "./store/mapStore";
import useContextStore from "./store/contextStore";
import { useEffect } from "react";
import PageHeader from "./components/PageHeader";

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
      <LoginOverlay />
      <UploadAreaDialog />
      <PageHeader />
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
