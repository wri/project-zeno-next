"use client";

import Link from "next/link";
import { Box, Flex, Heading, Link as ChakraLink, Text } from "@chakra-ui/react";
import { MapPinIcon } from "@phosphor-icons/react";

import type { Dashboard } from "../api/schemas";
import { sourceLabel } from "../lib/aoi";
import { updatedLabel } from "../lib/dates";

export default function DashboardCard({ dashboard }: { dashboard: Dashboard }) {
  const primaryAoi = dashboard.aois[0];
  const widgetCount = dashboard.widgets.length;

  return (
    <ChakraLink
      asChild
      display="flex"
      flexDir="column"
      minH="180px"
      bg="white"
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
          gap={3}
          p={4}
          pt={12}
        >
          {primaryAoi && (
            <Flex align="center" gap={1.5} color="primary.solid" fontSize="xs">
              <MapPinIcon size={14} />
              <Text lineClamp={1}>{primaryAoi.name}</Text>
            </Flex>
          )}
          <Box>
            <Heading as="h2" size="sm" fontWeight="medium" lineClamp={2}>
              {dashboard.name}
            </Heading>
            {primaryAoi && (
              <Text color="fg.muted" fontSize="xs" mt={1} lineClamp={1}>
                {sourceLabel(primaryAoi.source)}
              </Text>
            )}
          </Box>
          <Text color="fg.muted" fontSize="xs">
            {updatedLabel(dashboard.updated_at)}
            {widgetCount > 0 ? ` · ${widgetCount} widgets` : ""}
          </Text>
        </Flex>
      </Link>
    </ChakraLink>
  );
}
