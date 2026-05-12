"use client";

import { useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Container,
  Flex,
  Heading,
  Text,
  Button,
  SimpleGrid,
  Box,
  HStack,
} from "@chakra-ui/react";
import { formatDistanceToNow } from "date-fns";
import { FileTextIcon, PlusIcon } from "@phosphor-icons/react";
import useReportStore from "@/app/store/reportStore";
import useInsightStore from "@/app/store/insightStore";
import { REPORTS_PER_USER_LIMIT } from "@/app/types/portfolio";

export default function ReportsIndexPage() {
  const router = useRouter();
  const reports = useReportStore((s) => s.reports);
  const createReport = useReportStore((s) => s.createReport);
  const seedIfEmpty = useInsightStore((s) => s.seedIfEmpty);
  const insightsHydrated = useInsightStore((s) => s.hasHydrated);

  useEffect(() => {
    if (insightsHydrated) seedIfEmpty();
  }, [insightsHydrated, seedIfEmpty]);

  const sorted = useMemo(
    () =>
      [...reports].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ),
    [reports]
  );

  function handleCreate() {
    const r = createReport();
    router.push(`/reports/${r.id}`);
  }

  return (
    <Container maxW="5xl" py={8}>
      <Flex align="center" justify="space-between" gap={2} mb={1} flexWrap="wrap">
        <Flex align="center" gap={2}>
          <FileTextIcon size={20} />
          <Heading as="h1" size="lg" m={0}>
            Reports
          </Heading>
        </Flex>
        <Button colorPalette="primary" size="sm" onClick={handleCreate}>
          <PlusIcon size={16} />
          New report
        </Button>
      </Flex>
      <Text fontSize="sm" color="fg.muted" mb={6}>
        {reports.length} report{reports.length === 1 ? "" : "s"} · Up to{" "}
        {REPORTS_PER_USER_LIMIT} per user
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
          <Text mb={3}>No reports yet.</Text>
          <Button colorPalette="primary" size="sm" onClick={handleCreate}>
            <PlusIcon size={14} />
            Create your first report
          </Button>
        </Box>
      )}

      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
        {sorted.map((r) => (
          <Link
            key={r.id}
            href={`/reports/${r.id}`}
            style={{ textDecoration: "none" }}
          >
            <Box
              bg="bg"
              border="1px solid"
              borderColor="border"
              rounded="md"
              p={4}
              _hover={{ borderColor: "primary.solid", bg: "bg.muted" }}
              transition="all 0.12s"
              cursor="pointer"
            >
              <HStack mb={1.5}>
                <FileTextIcon size={16} />
                <Heading size="sm" m={0} truncate>
                  {r.name}
                </Heading>
              </HStack>
              <Text fontSize="xs" color="fg.muted">
                {r.blocks.length} block{r.blocks.length === 1 ? "" : "s"} ·
                Updated {formatDistanceToNow(new Date(r.updatedAt), { addSuffix: true })}
              </Text>
            </Box>
          </Link>
        ))}
      </SimpleGrid>
    </Container>
  );
}
