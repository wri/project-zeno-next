"use client";

import { Box, Grid, Text, Link as ChLink } from "@chakra-ui/react";
import Link from "next/link";

import LoginOverlay from "@/app/components/LoginOverlay";
import PageHeader from "@/app/components/PageHeader";
import Map from "@/app/components/Map";
import ChatStatusInfo from "@/app/components/ChatStatusInfo";

export default function ClassicLayout() {
  return (
    <Grid
      maxH="100vh"
      h="100vh"
      templateRows="min-content minmax(0px, 1fr)"
      bg="bg"
    >
      <LoginOverlay isClassicMode />
      <PageHeader />
      <Box h="calc(100vh - 3rem)" overflow="hidden" position="relative">
        <ChatStatusInfo
          position="absolute"
          top={4}
          left={4}
          zIndex={100}
          p={2}
          borderRadius="md"
        >
          <Text>
            AI features are unavailable.{" "}
            <ChLink as={Link} href="/">
              Go back to AI conversations
            </ChLink>
            .
          </Text>
        </ChatStatusInfo>
        <Map />
      </Box>
    </Grid>
  );
}
