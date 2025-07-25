"use client";
import { Box, Grid } from "@chakra-ui/react";
import { useParams } from "next/navigation";

import ChatPanel from "@/app/ChatPanel";
import LoginOverlay from "@/app/components/LoginOverlay";
import UploadAreaDialog from "../../components/UploadAreaDialog";
import Map from "@/app/components/Map";
import { Sidebar } from "@/app/sidebar";
import useChatStore from "@/app/store/chatStore";
import { useEffect } from "react";
import useMapStore from "@/app/store/mapStore";
import useContextStore from "@/app/store/contextStore";
import PageHeader from "@/app/components/PageHeader";

export default function SingleThread() {
  const { id } = useParams();
  const { reset: resetChatStore, fetchThread } = useChatStore();
  const { reset: resetMapStore } = useMapStore();
  const { reset: resetContextStore } = useContextStore();

  useEffect(() => {
    resetChatStore();
    resetMapStore();
    resetContextStore();
  }, [resetChatStore, resetMapStore, resetContextStore]);

  useEffect(() => {
    if (id) {
      fetchThread(id as string);
    }
  }, [id, fetchThread]);

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
          <Box overflow="hidden">
            <Map />
          </Box>
        </Grid>
      </Grid>
    </Grid>
  );
}
