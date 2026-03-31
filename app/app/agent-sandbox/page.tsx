"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect } from "react";
import { Flex, Grid, Heading, Badge } from "@chakra-ui/react";
import ChatPanel from "@/app/ChatPanel";
import Map from "@/app/components/Map";
import LclLogo from "@/app/components/LclLogo";
import useAuthStore from "@/app/store/authStore";
import useChatStore from "@/app/store/chatStore";
import useMapStore from "@/app/store/mapStore";
import useContextStore from "@/app/store/contextStore";
import { usePromptStore } from "@/app/store/promptStore";
import { API_CONFIG } from "@/app/config/api";

const PROTO_MESSAGE = [
  "**Agent sandbox** — no auth required.",
  "",
  `Requests go to \`${API_CONFIG.API_HOST}\` via \`NEXT_PUBLIC_API_HOST\` in \`.env.local\`.`,
  "",
  "All map tools work normally: AOIs render on the map, datasets load as tile layers, and chart insights appear inline.",
].join("\n");

export default function ApiDevPrototype() {
  // Guard: only available in development.
  // Auth is bypassed via the middleware exemption for /app/agent-sandbox (not via an env var).
  // process.env.NODE_ENV is inlined at build time by Next.js, so this tree-shakes in production.
  if (process.env.NODE_ENV === "production") return null;

  useEffect(() => {
    const savedPrompts = usePromptStore.getState().prompts;

    const applyProtoState = () => {
      useChatStore.setState({
        messages: [{ id: "proto-init", type: "system", message: PROTO_MESSAGE, timestamp: new Date().toISOString() }],
        isDevPrototype: true,
      });
      useChatStore.getState().setDevProtoClear(applyProtoState);
      usePromptStore.setState({ prompts: [] });
    };

    useChatStore.getState().reset();
    useMapStore.getState().reset();
    useContextStore.getState().reset();
    useAuthStore.getState().setPromptUsage(0, 999999);
    applyProtoState();

    return () => {
      useChatStore.setState({ isDevPrototype: false });
      useChatStore.getState().setDevProtoClear(null);
      usePromptStore.setState({ prompts: savedPrompts });
    };
  }, []);

  return (
    <Grid
      maxH="min(100dvh, 100vh)"
      h="min(100dvh, 100vh)"
      templateRows="min-content minmax(0px, 1fr)"
      bg="bg"
    >
      {/* Header */}
      <Flex
        alignItems="center"
        justifyContent="space-between"
        px={5}
        py="2"
        h={12}
        bg="primary.solid"
        color="fg.inverted"
        zIndex={1300}
        position="relative"
      >
        <Flex gap="2" alignItems="center">
          <LclLogo width={16} avatarOnly fill="white" />
          <Heading as="h1" size="sm" color="fg.inverted">
            Global Nature Watch
          </Heading>
          <Badge
            colorPalette="primary"
            bg="primary.800"
            letterSpacing="wider"
            variant="solid"
            size="xs"
          >
            AGENT SANDBOX
          </Badge>
        </Flex>
      </Flex>

      {/* Chat + Map — same grid pattern as the main app */}
      <Grid
        templateColumns="min-content 1fr"
        templateAreas="'chat map'"
        templateRows="1fr"
        maxH="calc(100vh - 3rem)"
      >
        <ChatPanel />
        <Map disableMapAreaControls />
      </Grid>
    </Grid>
  );
}
