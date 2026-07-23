"use client";

import { Box, Container, Flex } from "@chakra-ui/react";

import type { Dashboard } from "../api/schemas";
import { PINNED_HEADER_TOP_OFFSET_PX } from "../hooks/usePinnedHeader";
import DashboardBreadcrumb from "./DashboardBreadcrumb";
import DashboardHeader from "./DashboardHeader";
import { HERO_BAND_PROPS } from "./heroGrid";

/**
 * Condensed header per the Figma "Dashboard default_Adaptative header banner"
 * frame: once the in-page header scrolls behind the global nav, a fixed strip
 * (page background + breadcrumb) and a 104px white bar — same blue top accent
 * and rounded top corners as the dashboard card, elevated with a shadow —
 * take over, keeping the title and Export/Share available while widgets
 * scroll underneath.
 *
 * Kept mounted and toggled with opacity/transform so the pin/unpin transition
 * is smooth; `visibility` removes it from the tab order and the accessibility
 * tree while hidden.
 */
export default function DashboardPinnedHeader({
  dashboard,
  isOwner,
  pinned,
  contentLeftPx,
}: {
  dashboard: Dashboard;
  isOwner: boolean;
  pinned: boolean;
  contentLeftPx: number;
}) {
  return (
    <Box
      position="fixed"
      top={`${PINNED_HEADER_TOP_OFFSET_PX}px`}
      left={0}
      right={0}
      // Above the page content, below the chat overlay (1100) and nav (1300).
      zIndex={1000}
      bg="#F4F5F6"
      pt={6}
      pl={{ base: 0, md: `${contentLeftPx}px` }}
      opacity={pinned ? 1 : 0}
      transform={pinned ? "translateY(0)" : "translateY(-8px)"}
      visibility={pinned ? "visible" : "hidden"}
      pointerEvents={pinned ? "auto" : "none"}
      transition="opacity 0.2s ease, transform 0.2s ease, visibility 0.2s, padding-left 0.2s ease-in-out"
      _motionReduce={{ transition: "none" }}
      aria-hidden={!pinned}
    >
      <Container maxW="1232px">
        <Flex direction="column" gap="12px">
          <DashboardBreadcrumb name={dashboard.name} />
          <Flex
            h="104px"
            align="center"
            bgColor="white"
            {...HERO_BAND_PROPS}
            borderTopWidth="2px"
            borderTopColor="#0049AA"
            borderTopRadius="8px"
            boxShadow="0px 10px 15px -3px rgba(0,0,0,0.1), 0px 4px 6px -4px rgba(0,0,0,0.1)"
            px={{ base: 6, md: "46px" }}
          >
            <Box flex="1" minW={0}>
              <DashboardHeader
                dashboard={dashboard}
                isOwner={isOwner}
                condensed
              />
            </Box>
          </Flex>
        </Flex>
      </Container>
    </Box>
  );
}
