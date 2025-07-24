"use client";

import Map from "@/app/components/Map";
import { Box, Flex, Grid, Heading, Button, Progress } from "@chakra-ui/react";
import { Sidebar } from "./sidebar";
import ChatPanel from "./ChatPanel";
import LclLogo from "./components/LclLogo";
import LoginOverlay from "./components/LoginOverlay";
import UploadAreaDialog from "./components/UploadAreaDialog";
import useChatStore from "./store/chatStore";
import useMapStore from "./store/mapStore";
import useContextStore from "./store/contextStore";
import { useEffect } from "react";

import { LifebuoyIcon, UserIcon } from "@phosphor-icons/react";

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
        <Flex gap="6">
          <Button variant="solid" colorPalette="blue" size="sm">
            <LifebuoyIcon />
            Help
          </Button>

          <Progress.Root
            size="xs"
            min={0}
            max={100}
            value={40}
            variant="subtle"
            colorPalette="blue"
            // className="dark"
          >
            <Progress.Label mb="1">40 / 100 Prompts</Progress.Label>
            <Progress.Track>
              <Progress.Range />
            </Progress.Track>
          </Progress.Root>

          <Button variant="solid" colorPalette="blue" size="sm">
            <UserIcon />
            User Name
          </Button>
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
