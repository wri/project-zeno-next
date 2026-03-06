"use client";

import {
  Button,
  Flex,
  Heading,
  Stack,
  Text,
  Box,
  IconButton,
} from "@chakra-ui/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChatCircleIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import useReportStore from "@/app/store/reportStore";

export default function ReportBuilderPage() {
  const { reports, createReport, deleteReport } = useReportStore();
  const router = useRouter();

  const handleCreate = () => {
    const id = createReport();
    router.push(`/app/report-builder/${id}`);
  };

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
        <Heading size="lg">Reports</Heading>
        <Button onClick={handleCreate} size="sm" colorPalette="primary">
          <PlusIcon /> New Report
        </Button>
      </Flex>

      {reports.length === 0 ? (
        <Text color="fg.muted">
          No reports yet. Create one to get started.
        </Text>
      ) : (
        <Stack gap={2}>
          {reports.map((r) => (
            <Flex
              key={r.id}
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
                <Link href={`/app/report-builder/${r.id}`}>
                  <Text fontWeight="medium">{r.title}</Text>
                  <Text fontSize="xs" color="fg.muted">
                    Updated {new Date(r.updatedAt).toLocaleDateString()}
                  </Text>
                </Link>
              </Box>
              <IconButton
                variant="ghost"
                size="sm"
                colorPalette="red"
                onClick={(e) => {
                  e.preventDefault();
                  deleteReport(r.id);
                }}
                aria-label={`Delete ${r.title}`}
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
