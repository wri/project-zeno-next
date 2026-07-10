"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import {
  Box,
  Container,
  Flex,
  Heading,
  Spinner,
  Text,
  Link as ChakraLink,
} from "@chakra-ui/react";
import { SquaresFourIcon } from "@phosphor-icons/react";

import ChatPanel from "@/app/ChatPanel";
import { getDashboardContentLeftPx } from "@/app/explorationLayout";
import useAgentProfileStore from "@/app/store/agentProfileStore";
import useAuthStore from "@/app/store/authStore";
import useSidebarStore from "@/app/store/sidebarStore";
import useViewContextStore from "@/app/store/viewContextStore";
import { useDashboard } from "./dashboardQueries";
import DashboardHeader from "./DashboardHeader";
import DashboardWidgetsGrid from "./DashboardWidgetsGrid";

export default function DashboardDetailPage() {
  const params = useParams<{ id: string }>();
  const dashboardId = params?.id ?? "";
  const { data: dashboard, isLoading, isError } = useDashboard(dashboardId);
  const isChatFullSize = useSidebarStore((s) => s.isChatFullSize);
  const userId = useAuthStore((s) => s.userId);
  const isOwner = !!userId && userId === dashboard?.user_id;

  useEffect(() => {
    // The dashboard agent tools are gated behind ?agent_profile=…; capture it
    // here too, since a direct dashboard landing never mounts the app chat
    // layout (the only other capture point).
    useAgentProfileStore.getState().initFromUrl();
  }, []);

  useEffect(() => {
    // Report this surface to the agent on every chat request ("this
    // dashboard" scoping, add_to_dashboard default target). The name rides
    // along once the query resolves so the agent can name the dashboard
    // without a DB read.
    if (!dashboardId) return;
    useViewContextStore.getState().setViewContext({
      page: "dashboard",
      dashboard_id: dashboardId,
      ...(dashboard?.name && { dashboard_name: dashboard.name }),
    });
  }, [dashboardId, dashboard?.name]);

  return (
    // The full-size chat is a fixed, full-height overlay on the left, so the
    // content pane pads past it and the centered container re-centers in the
    // remaining space. Duration matches the chat's own resize animation.
    <Box
      bg="#F4F5F6"
      minH="calc(100vh - 40px)"
      py={{ base: 8, md: 10 }}
      pl={{
        base: 0,
        md: `${getDashboardContentLeftPx(isChatFullSize)}px`,
      }}
      transition="padding-left 0.2s ease-in-out"
    >
      {/* Chat overlay — the same conversation as the map app (chatStore is a
          singleton). Fixed below the 40px header so it stays put while the
          dashboard content scrolls. Desktop-only for now; the mobile bottom
          sheet is a later slice. */}
      <Box
        position="fixed"
        top="40px"
        bottom={0}
        left={0}
        zIndex={1100}
        display={{ base: "none", md: "flex" }}
        flexDir="column"
        pointerEvents="none"
      >
        <ChatPanel />
      </Box>
      <Container maxW="1232px">
        <Flex direction="column" gap="12px">
          <Flex align="center" gap="8px" fontSize="14px" lineHeight="16px">
            <ChakraLink asChild color="#565E7B">
              <Link href="/dashboards?ff=dashboard">Dashboards</Link>
            </ChakraLink>
            <Text color="#C2C7D0">/</Text>
            <Text color="#565E7B">{dashboard?.name ?? "Dashboard"}</Text>
          </Flex>

          {isLoading ? (
            <Flex align="center" gap={2} color="fg.muted" py={12}>
              <Spinner size="sm" /> Loading dashboard...
            </Flex>
          ) : isError || !dashboard ? (
            <Text color="fg.error" py={12}>
              Could not load this dashboard.
            </Text>
          ) : (
            <Box
              bg="white"
              minH="70vh"
              borderWidth="1px"
              borderTopWidth="2px"
              borderTopColor="primary.solid"
              borderColor="rgba(19,22,25,0.1)"
              borderRadius="8px"
              px={{ base: 6, md: "46px" }}
              pt={{ base: 6, md: "38px" }}
              pb={{ base: 6, md: "46px" }}
            >
              <Box mb={{ base: 8, md: 16 }}>
                <DashboardHeader dashboard={dashboard} isOwner={isOwner} />
              </Box>

              {dashboard.widgets.length > 0 ? (
                <DashboardWidgetsGrid dashboard={dashboard} />
              ) : (
                <Flex
                  minH="320px"
                  align="center"
                  justify="center"
                  borderWidth="1px"
                  borderStyle="dashed"
                  borderColor="border"
                  borderRadius="sm"
                  bg="white"
                  px={6}
                  textAlign="center"
                >
                  <Box maxW="md">
                    <SquaresFourIcon size={32} color="#656E7B" />
                    <Heading as="h2" size="md" mt={4} mb={2}>
                      This dashboard is empty
                    </Heading>
                    <Text color="fg.muted">
                      Ask the AI assistant to analyse this area — insights it
                      adds to the dashboard will appear here.
                    </Text>
                  </Box>
                </Flex>
              )}
            </Box>
          )}
        </Flex>
      </Container>
    </Box>
  );
}
