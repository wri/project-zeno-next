"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Box,
  Container,
  Flex,
  Heading,
  Spinner,
  Text,
  Link as ChakraLink,
} from "@chakra-ui/react";
import { MapPinIcon, SquaresFourIcon } from "@phosphor-icons/react";

import { sourceLabel, subtypeLabel } from "../lib/aoi";
import { updatedLabel } from "../lib/dates";
import { useDashboard } from "./dashboardQueries";

export default function DashboardDetailPage() {
  const params = useParams<{ id: string }>();
  const dashboardId = params?.id ?? "";
  const { data: dashboard, isLoading, isError } = useDashboard(dashboardId);

  return (
    <Box bg="#F4F5F6" minH="calc(100vh - 40px)" py={{ base: 8, md: 10 }}>
      <Container maxW="6xl">
        <Flex direction="column" gap={4}>
          <Flex align="center" gap={2} color="fg.muted" fontSize="sm">
            <ChakraLink asChild color="fg.muted">
              <Link href="/dashboards?ff=dashboard">Dashboards</Link>
            </ChakraLink>
            <Text>/</Text>
            <Text color="fg">{dashboard?.name ?? "Dashboard"}</Text>
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
              borderColor="border"
              borderRadius="sm"
              p={{ base: 6, md: 10 }}
            >
              <Flex justify="space-between" align="flex-start" gap={6} mb={10}>
                <Box>
                  <Heading as="h1" size="2xl" fontWeight="normal">
                    {dashboard.name}
                  </Heading>
                  <Text color="fg.muted" fontSize="xs" mt={2}>
                    {updatedLabel(dashboard.updated_at)}
                  </Text>
                </Box>
              </Flex>

              {dashboard.aois[0] && (
                <Flex
                  align="center"
                  gap={3}
                  bg="bg.subtle"
                  borderWidth="1px"
                  borderColor="border"
                  borderRadius="sm"
                  p={4}
                  mb={8}
                  maxW="xl"
                >
                  <MapPinIcon size={20} color="#0049AA" />
                  <Box>
                    <Text fontWeight="medium">{dashboard.aois[0].name}</Text>
                    <Text color="fg.muted" fontSize="sm">
                      {sourceLabel(dashboard.aois[0].source)}
                      {dashboard.aois[0].subtype
                        ? ` · ${subtypeLabel(dashboard.aois[0].subtype)}`
                        : ""}
                    </Text>
                  </Box>
                </Flex>
              )}

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
                    The dashboard has been created for this area. Widgets,
                    analyses, and maps can be added in a later slice.
                  </Text>
                </Box>
              </Flex>
            </Box>
          )}
        </Flex>
      </Container>
    </Box>
  );
}
