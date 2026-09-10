"use client";

import { Link } from "@/app/lib/router";
import { Box, Flex, Heading, Link as ChakraLink, Text } from "@chakra-ui/react";
import { LockIcon, PolygonIcon } from "@phosphor-icons/react";

import type { Dashboard } from "../api/schemas";
import { updatedLabel } from "../lib/dates";
import DashboardActionsMenu from "./DashboardActionsMenu";
import { HERO_GRID_IMAGE } from "./heroGrid";

export default function DashboardCard({ dashboard }: { dashboard: Dashboard }) {
  const primaryAoi = dashboard.aois[0];

  return (
    <Box position="relative" display="flex" flexDir="column">
      <ChakraLink
        asChild
        display="flex"
        flexDir="column"
        // Chakra's Link defaults to align-items: center, which would centre
        // the column content; the design is left-justified.
        alignItems="stretch"
        textAlign="left"
        flex="1"
        minH="308px"
        bg="white"
        backgroundImage={HERO_GRID_IMAGE}
        borderWidth="1px"
        borderColor="border"
        borderTopWidth="2px"
        borderTopColor="primary.solid"
        borderRadius="sm"
        overflow="hidden"
        transition="border-color 0.16s ease, box-shadow 0.16s ease"
        _hover={{
          borderColor: "primary.solid",
          boxShadow: "sm",
          textDecor: "none",
        }}
        _focusVisible={{
          outline: "2px solid",
          outlineColor: "primary.focusRing",
          outlineOffset: "2px",
        }}
      >
        <Link href={`/dashboards/${dashboard.id}`}>
          <Flex
            flex="1"
            direction="column"
            justify="flex-end"
            gap={2}
            p={5}
            pt={16}
          >
            {primaryAoi && (
              <Flex align="center" gap={2} color="primary.solid" fontSize="xs">
                <PolygonIcon size={16} />
                <Text lineClamp={1}>{primaryAoi.name}</Text>
              </Flex>
            )}
            <Heading
              as="h2"
              fontSize="lg"
              fontWeight="normal"
              lineHeight="1.4"
              lineClamp={3}
            >
              {dashboard.name}
            </Heading>
            <Flex align="center" gap={2} color="fg.muted" fontSize="xs">
              {!dashboard.is_public && <LockIcon size={16} />}
              <Text>{updatedLabel(dashboard.updated_at)}</Text>
            </Flex>
          </Flex>
        </Link>
      </ChakraLink>
      {/* Sibling of the link, not a child — a button inside an anchor would
          trigger navigation on menu clicks. */}
      <Box position="absolute" top={5} right={5}>
        <DashboardActionsMenu dashboard={dashboard} />
      </Box>
    </Box>
  );
}
