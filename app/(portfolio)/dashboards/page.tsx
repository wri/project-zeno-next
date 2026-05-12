"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Container,
  Flex,
  Heading,
  Text,
  Box,
  SimpleGrid,
  HStack,
  Badge,
} from "@chakra-ui/react";
import { formatDistanceToNow } from "date-fns";
import { SquaresFourIcon, MapPinIcon } from "@phosphor-icons/react";
import useDashboardStore from "@/app/store/dashboardStore";

export default function DashboardsIndexPage() {
  const dashboards = useDashboardStore((s) => s.dashboards);

  const sorted = useMemo(
    () =>
      [...dashboards].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ),
    [dashboards]
  );

  return (
    <Container maxW="5xl" py={8}>
      <Flex align="center" gap={2} mb={1}>
        <SquaresFourIcon size={20} />
        <Heading as="h1" size="lg" m={0}>
          Area Dashboards
        </Heading>
      </Flex>
      <Text fontSize="sm" color="fg.muted" mb={6}>
        {dashboards.length} dashboard{dashboards.length === 1 ? "" : "s"} ·
        Created from the Insight Inbox
      </Text>

      {sorted.length === 0 && (
        <Box
          border="1px dashed"
          borderColor="border"
          rounded="md"
          p={10}
          textAlign="center"
          color="fg.muted"
        >
          <Text mb={3}>
            No dashboards yet.
          </Text>
          <Text fontSize="xs">
            Dashboards are seeded from a single inbox insight — visit{" "}
            <Link href="/inbox" style={{ textDecoration: "underline" }}>
              /inbox
            </Link>{" "}
            and click <em>Seed area dashboard</em> on any insight.
          </Text>
        </Box>
      )}

      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
        {sorted.map((d) => (
          <Link
            key={d.id}
            href={`/dashboards/${d.id}`}
            style={{ textDecoration: "none" }}
          >
            <Box
              bg="bg"
              border="1px solid"
              borderColor="border"
              borderLeft="3px solid"
              borderLeftColor="green.solid"
              rounded="md"
              p={4}
              _hover={{ borderColor: "primary.solid", bg: "bg.muted" }}
              transition="all 0.12s"
              cursor="pointer"
            >
              <HStack mb={1.5}>
                <MapPinIcon size={16} />
                <Heading size="sm" m={0} truncate>
                  {d.name}
                </Heading>
                {d.aoi.isMultiArea && (
                  <Badge colorPalette="orange" variant="subtle" size="xs">
                    Multi-area
                  </Badge>
                )}
              </HStack>
              <Text fontSize="xs" color="fg.muted">
                {d.blocks.length} block{d.blocks.length === 1 ? "" : "s"} ·
                Created {formatDistanceToNow(new Date(d.createdAt), { addSuffix: true })}
              </Text>
            </Box>
          </Link>
        ))}
      </SimpleGrid>
    </Container>
  );
}
