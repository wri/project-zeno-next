"use client";

import Map from "@/app/components/Map";
import { Box, Flex, Grid, Heading } from "@chakra-ui/react";
import { Sidebar } from "./sidebar";
import ChatPanel from "./ChatPanel";
import LclLogo from "./components/LclLogo";
import LoginOverlay from "./components/LoginOverlay";
import MapTools from "./components/MapTools";

export default function Home() {
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
          <Box overflow="hidden" position="relative">
            <Box position="absolute" top="4" left="50%" transform="translate(-50%, 0)" zIndex="1000">
              <MapTools />
            </Box>
            <Map />
          </Box>
        </Grid>
      </Grid>
    </Grid>
  );
}
