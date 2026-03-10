"use client";

import {
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  IconButton,
  Stack,
  Text,
} from "@chakra-ui/react";
import Link from "next/link";
import {
  ChatCircleIcon,
  PlusIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import useDashboardStore from "@/app/store/dashboardStore";

export default function MonitorPage() {
  const { dashboards, deleteDashboard } = useDashboardStore();

  return (
    <Box maxW="4xl" mx="auto">
      <Flex align="center" gap={2} mb={4}>
        <Button asChild variant="ghost" size="sm">
          <Link href="/app">
            <ChatCircleIcon /> Back to Chat
          </Link>
        </Button>
      </Flex>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg">Dashboards</Heading>
        <Button asChild size="sm" colorPalette="primary">
          <Link href="/app/monitor/new">
            <PlusIcon /> New Dashboard
          </Link>
        </Button>
      </Flex>

      {dashboards.length === 0 ? (
        <Text color="fg.muted">
          No dashboards yet. Create one to get started.
        </Text>
      ) : (
        <Stack gap={2}>
          {dashboards.map((d) => (
            <Flex
              key={d.id}
              align="center"
              justify="space-between"
              border="1px solid"
              borderColor="border.muted"
              rounded="md"
              px={4}
              py={3}
              _hover={{ bg: "bg.muted" }}
              transition="background 0.15s"
            >
              <Box asChild flex="1">
                <Link href={`/app/monitor/${d.id}`}>
                  <Text fontWeight="medium">{d.title}</Text>
                  <Flex gap={2} mt={0.5}>
                    <Text fontSize="xs" color="fg.muted">
                      Updated {new Date(d.updatedAt).toLocaleDateString()}
                    </Text>
                    <Badge size="xs" variant="outline">
                      {d.setupMetadata.datasetIds.length} dataset
                      {d.setupMetadata.datasetIds.length !== 1 ? "s" : ""}
                    </Badge>
                    <Badge size="xs" variant="outline">
                      {d.setupMetadata.areaIds.length} area
                      {d.setupMetadata.areaIds.length !== 1 ? "s" : ""}
                    </Badge>
                  </Flex>
                </Link>
              </Box>
              <IconButton
                variant="ghost"
                size="sm"
                colorPalette="red"
                onClick={(e) => {
                  e.preventDefault();
                  deleteDashboard(d.id);
                }}
                aria-label={`Delete ${d.title}`}
              >
                <TrashIcon />
              </IconButton>
            </Flex>
          ))}
        </Stack>
      )}
    </Box>
  );
}
