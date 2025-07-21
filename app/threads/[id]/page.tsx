"use client";
import { Box, Flex, Grid, Heading } from "@chakra-ui/react";
import { useParams } from "next/navigation";

import ChatPanel from "@/app/ChatPanel";
import LclLogo from "@/app/components/LclLogo";
import LoginOverlay from "@/app/components/LoginOverlay";
import Map from "@/app/components/Map";
import { Sidebar } from "@/app/sidebar";
import useChatStore from "@/app/store/chatStore";
import { useEffect } from "react";
import useMapStore from "@/app/store/mapStore";
import useContextStore from "@/app/store/contextStore";

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
          <Box overflow="hidden">
            <Map />
          </Box>
        </Grid>
      </Grid>
    </Grid>
  );
}
