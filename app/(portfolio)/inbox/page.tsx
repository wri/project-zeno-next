"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Container,
  Flex,
  Heading,
  HStack,
  Text,
  Input,
  Menu,
  Portal,
  Button,
  VStack,
  Badge,
} from "@chakra-ui/react";
import { CaretDownIcon, TrayIcon } from "@phosphor-icons/react";
import usePinnedInsightStore from "@/app/store/pinnedInsightStore";
import useDashboardStore from "@/app/store/dashboardStore";
import useReportStore from "@/app/store/reportStore";
import InsightCard from "@/app/components/portfolio/InsightCard";
import AddToReportDialog from "@/app/components/portfolio/AddToReportDialog";
import { REPORT_INSIGHT_LIMIT } from "@/app/types/portfolio";
import { toaster } from "@/app/components/ui/toaster";

export default function InboxPage() {
  const router = useRouter();
  const insights = usePinnedInsightStore((s) => s.insights);
  const seedIfEmpty = usePinnedInsightStore((s) => s.seedIfEmpty);
  const hasHydrated = usePinnedInsightStore((s) => s.hasHydrated);
  const createDashboard = useDashboardStore((s) => s.createDashboard);
  const createReport = useReportStore((s) => s.createReport);

  const [search, setSearch] = useState("");
  const [datasetFilter, setDatasetFilter] = useState<string | null>(null);
  const [aoiFilter, setAoiFilter] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);

  // Seed the inbox the first time after hydration if nothing's there.
  useEffect(() => {
    if (hasHydrated) seedIfEmpty();
  }, [hasHydrated, seedIfEmpty]);

  const sorted = useMemo(
    () =>
      [...insights].sort(
        (a, b) =>
          new Date(b.pinnedAt).getTime() - new Date(a.pinnedAt).getTime()
      ),
    [insights]
  );

  const datasets = useMemo(() => {
    const s = new Set<string>();
    insights.forEach((i) => i.datasetName && s.add(i.datasetName));
    return [...s].sort();
  }, [insights]);

  const aois = useMemo(() => {
    const s = new Set<string>();
    insights.forEach((i) => s.add(i.aoi.name));
    return [...s].sort();
  }, [insights]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sorted.filter((i) => {
      if (datasetFilter && i.datasetName !== datasetFilter) return false;
      if (aoiFilter && i.aoi.name !== aoiFilter) return false;
      if (!q) return true;
      return (
        i.title.toLowerCase().includes(q) ||
        i.aoi.name.toLowerCase().includes(q) ||
        (i.datasetName ?? "").toLowerCase().includes(q)
      );
    });
  }, [sorted, search, datasetFilter, aoiFilter]);

  function toggleSelect(id: string, selected: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function handleSeedDashboard(insightId: string) {
    const insight = insights.find((i) => i.id === insightId);
    if (!insight) return;
    const d = createDashboard({
      aoi: insight.aoi,
      seededFromInsightId: insightId,
    });
    toaster.create({
      title: "Dashboard created",
      description: `Seeded from "${insight.title}"`,
      type: "success",
      duration: 2500,
    });
    router.push(`/dashboards/${d.id}`);
  }

  function handleCreateReportFromInsight(insightId: string) {
    const insight = insights.find((i) => i.id === insightId);
    if (!insight) return;
    const report = createReport(undefined, [insightId]);
    toaster.create({
      title: "Report created",
      description: `Started from "${insight.title}"`,
      type: "success",
      duration: 2500,
    });
    router.push(`/reports/${report.id}`);
  }

  const selectedArray = useMemo(
    () => [...selectedIds].filter((id) => insights.some((i) => i.id === id)),
    [selectedIds, insights]
  );
  const singleSelected = selectedArray.length === 1;

  return (
    <Container maxW="5xl" py={8}>
      <Flex align="center" gap={2} mb={1}>
        <TrayIcon size={20} />
        <Heading as="h1" size="lg" m={0}>
          Insight Inbox
        </Heading>
      </Flex>
      <Text fontSize="sm" color="fg.muted" mb={5}>
        {insights.length} insight{insights.length === 1 ? "" : "s"} · from all
        conversations · Up to {REPORT_INSIGHT_LIMIT} insights per report
      </Text>

      <Flex
        gap={2}
        align="center"
        flexWrap="wrap"
        mb={4}
        position="sticky"
        top="56px"
        zIndex={20}
        bg="bg.subtle"
        py={2}
      >
        <Input
          placeholder="Search insights..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          maxW="280px"
          size="sm"
          bg="bg"
        />
        <FilterPill
          label={datasetFilter ?? "All datasets"}
          options={datasets}
          value={datasetFilter}
          onChange={setDatasetFilter}
        />
        <FilterPill
          label={aoiFilter ?? "All AOIs"}
          options={aois}
          value={aoiFilter}
          onChange={setAoiFilter}
        />
        {(datasetFilter || aoiFilter || search) && (
          <Button
            size="xs"
            variant="ghost"
            onClick={() => {
              setSearch("");
              setDatasetFilter(null);
              setAoiFilter(null);
            }}
          >
            Clear
          </Button>
        )}
      </Flex>

      <VStack align="stretch" gap={2} pb={selectedArray.length > 0 ? 24 : 0}>
        {filtered.length === 0 && (
          <Box
            border="1px dashed"
            borderColor="border"
            rounded="md"
            p={8}
            textAlign="center"
            color="fg.muted"
          >
            {insights.length === 0
              ? "No insights pinned yet. Pin a chart from chat to start."
              : "No insights match the current search and filters."}
          </Box>
        )}
        {filtered.map((insight) => (
          <InsightCard
            key={insight.id}
            insight={insight}
            selected={selectedIds.has(insight.id)}
            onSelectChange={(s) => toggleSelect(insight.id, s)}
            onSeedDashboard={() => handleSeedDashboard(insight.id)}
            onCreateReport={() => handleCreateReportFromInsight(insight.id)}
            onViewSource={() => {
              toaster.create({
                title: "Coming soon",
                description: "Linking back to the source conversation.",
                type: "info",
                duration: 2000,
              });
            }}
          />
        ))}
      </VStack>

      {selectedArray.length > 0 && (
        <Box
          position="fixed"
          bottom={4}
          left="50%"
          transform="translateX(-50%)"
          bg="bg"
          border="1px solid"
          borderColor="primary.solid"
          rounded="full"
          px={5}
          py={2}
          boxShadow="lg"
          zIndex={30}
        >
          <HStack gap={4}>
            <Badge colorPalette="purple">
              {selectedArray.length} selected
            </Badge>
            <Button
              size="sm"
              colorPalette="primary"
              onClick={() => setDialogOpen(true)}
            >
              Add to report →
            </Button>
            <Button
              size="sm"
              variant="outline"
              colorPalette="green"
              disabled={!singleSelected}
              title={
                singleSelected
                  ? undefined
                  : "Select exactly one insight to seed a dashboard"
              }
              onClick={() => handleSeedDashboard(selectedArray[0])}
            >
              ⊕ Seed area dashboard
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear
            </Button>
          </HStack>
        </Box>
      )}

      <AddToReportDialog
        open={dialogOpen}
        insightIds={selectedArray}
        onClose={() => setDialogOpen(false)}
        onAdded={(reportId, isNew) => {
          setDialogOpen(false);
          setSelectedIds(new Set());
          toaster.create({
            title: isNew ? "Report created" : "Added to report",
            description: `${selectedArray.length} insight${selectedArray.length === 1 ? "" : "s"} pinned.`,
            type: "success",
            duration: 2000,
          });
          if (isNew) router.push(`/reports/${reportId}`);
        }}
      />
    </Container>
  );
}

function FilterPill({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <Button
          size="xs"
          variant="outline"
          rounded="full"
          colorPalette={value ? "primary" : undefined}
        >
          {label}
          <CaretDownIcon size={12} />
        </Button>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content>
            <Menu.Item value="__all" onClick={() => onChange(null)}>
              All
            </Menu.Item>
            {options.map((opt) => (
              <Menu.Item
                key={opt}
                value={opt}
                onClick={() => onChange(opt)}
              >
                {opt}
              </Menu.Item>
            ))}
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}
