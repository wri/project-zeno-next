"use client";

import { useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  CloseButton,
  Dialog,
  Field,
  Flex,
  Input,
  Portal,
  Separator,
  Text,
  VStack,
} from "@chakra-ui/react";
import {
  FilePlusIcon,
  FileTextIcon,
  MapPinPlusIcon,
  SquaresFourIcon,
} from "@phosphor-icons/react";
import usePinnedInsightStore from "@/app/store/pinnedInsightStore";
import useReportStore from "@/app/store/reportStore";
import useDashboardStore from "@/app/store/dashboardStore";
import { toaster } from "@/app/components/ui/toaster";
import type { PinnedInsight } from "@/app/types/portfolio";

type PendingPinInput = Omit<PinnedInsight, "id" | "pinnedAt">;

type Props = {
  open: boolean;
  pendingPin: PendingPinInput | null;
  onClose: () => void;
};

type Mode = "pick" | "newReport" | "newDashboard";

// Pin destination picker. Opens when the user clicks "Pin" on a chart/table
// widget that isn't yet in the inbox. The pin always lands in the inbox —
// any destination selection just creates an additional block on the chosen
// report or dashboard. Closing the dialog without picking still pins to
// inbox, so users never lose the action they triggered.
export default function PinDestinationDialog({
  open,
  pendingPin,
  onClose,
}: Props) {
  const reports = useReportStore((s) => s.reports);
  const dashboards = useDashboardStore((s) => s.dashboards);
  const addInsight = usePinnedInsightStore((s) => s.addInsight);
  const addInsightBlockToReport = useReportStore((s) => s.addInsightBlock);
  const addInsightBlockToDashboard = useDashboardStore(
    (s) => s.addInsightBlock
  );
  const createReport = useReportStore((s) => s.createReport);
  const createDashboard = useDashboardStore((s) => s.createDashboard);

  const [mode, setMode] = useState<Mode>("pick");
  const [newName, setNewName] = useState("");
  // Flips true on any explicit destination pick so the close path below
  // doesn't double-create the inbox entry.
  const settledRef = useRef(false);

  const sortedReports = useMemo(
    () =>
      [...reports].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ),
    [reports]
  );
  const sortedDashboards = useMemo(
    () =>
      [...dashboards].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ),
    [dashboards]
  );

  function reset() {
    setMode("pick");
    setNewName("");
    settledRef.current = false;
  }

  function pinToInbox(): PinnedInsight | null {
    if (!pendingPin) return null;
    return addInsight(pendingPin);
  }

  function finish() {
    reset();
    onClose();
  }

  function handleAddToReport(reportId: string, reportName: string) {
    const record = pinToInbox();
    if (!record) return finish();
    addInsightBlockToReport(reportId, record.id);
    settledRef.current = true;
    toaster.create({
      title: "Added to report",
      description: reportName,
      type: "success",
      duration: 2400,
    });
    finish();
  }

  function handleAddToDashboard(dashboardId: string, dashboardName: string) {
    const record = pinToInbox();
    if (!record) return finish();
    addInsightBlockToDashboard(dashboardId, record.id);
    settledRef.current = true;
    toaster.create({
      title: "Added to dashboard",
      description: dashboardName,
      type: "success",
      duration: 2400,
    });
    finish();
  }

  function handleCreateNewReport() {
    const record = pinToInbox();
    if (!record) return finish();
    const report = createReport(newName, [record.id]);
    settledRef.current = true;
    toaster.create({
      title: `Created report "${report.name}"`,
      description: "Insight added as the first block.",
      type: "success",
      duration: 2400,
    });
    finish();
  }

  function handleCreateNewDashboard() {
    const record = pinToInbox();
    if (!record) return finish();
    const dashboard = createDashboard({
      name: newName,
      aoi: record.aoi,
      seededFromInsightId: record.id,
    });
    settledRef.current = true;
    toaster.create({
      title: `Created dashboard "${dashboard.name}"`,
      description: `Seeded with this insight for ${record.aoi.name}.`,
      type: "success",
      duration: 2400,
    });
    finish();
  }

  function handleOpenChange(e: { open: boolean }) {
    if (e.open) return;
    // Closed via X / Esc / backdrop without a destination — still pin to
    // inbox so the user doesn't lose the action.
    if (!settledRef.current) {
      const record = pinToInbox();
      if (record) {
        toaster.create({
          title: "Saved to inbox",
          description: record.title,
          type: "success",
          duration: 2000,
        });
      }
    }
    reset();
    onClose();
  }

  const aoiLabel = pendingPin?.aoi.isMultiArea
    ? `Multi-area · ${pendingPin.aoi.src_ids.length} areas`
    : pendingPin?.aoi.name ?? "";

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange} size="md">
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content p={5}>
            <Dialog.Header px={0} pt={0} pb={3}>
              <Dialog.Title fontSize="md" fontWeight="semibold">
                Pin insight
              </Dialog.Title>
              <Dialog.CloseTrigger asChild position="absolute" top={3} right={3}>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body px={0}>
              {pendingPin && (
                <Box mb={3}>
                  <Text fontSize="sm" fontWeight="medium" color="fg" truncate>
                    {pendingPin.title}
                  </Text>
                  <Text fontSize="xs" color="fg.muted" truncate>
                    {[pendingPin.datasetName, aoiLabel]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                </Box>
              )}

              {mode === "pick" && (
                <VStack align="stretch" gap={4}>
                  <Text fontSize="xs" color="fg.muted">
                    Closing without a destination still saves it to your inbox.
                  </Text>

                  {/* Reports */}
                  <Box>
                    <Flex justify="space-between" align="center" mb={2}>
                      <Text
                        fontSize="xs"
                        fontWeight="semibold"
                        color="fg.muted"
                        textTransform="uppercase"
                        letterSpacing="wider"
                      >
                        Reports
                      </Text>
                      <Button
                        size="2xs"
                        variant="outline"
                        onClick={() => setMode("newReport")}
                      >
                        <FilePlusIcon size={12} />
                        New canvas
                      </Button>
                    </Flex>
                    {sortedReports.length === 0 ? (
                      <Text fontSize="xs" color="fg.muted" px={2} py={2}>
                        No reports yet — create your first canvas.
                      </Text>
                    ) : (
                      <VStack align="stretch" gap={1.5}>
                        {sortedReports.map((report) => (
                          <Flex
                            key={report.id}
                            align="center"
                            justify="space-between"
                            gap={3}
                            px={3}
                            py={2}
                            border="1px solid"
                            borderColor="border"
                            rounded="md"
                            _hover={{ borderColor: "border.emphasized" }}
                          >
                            <Flex align="center" gap={2} minW={0}>
                              <Box color="fg.muted">
                                <FileTextIcon size={14} />
                              </Box>
                              <Box minW={0}>
                                <Text fontSize="sm" fontWeight="medium" truncate>
                                  {report.name}
                                </Text>
                                <Text fontSize="xs" color="fg.muted">
                                  {report.blocks.length} block
                                  {report.blocks.length === 1 ? "" : "s"}
                                </Text>
                              </Box>
                            </Flex>
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() =>
                                handleAddToReport(report.id, report.name)
                              }
                            >
                              Add
                            </Button>
                          </Flex>
                        ))}
                      </VStack>
                    )}
                  </Box>

                  <Separator />

                  {/* Dashboards */}
                  <Box>
                    <Flex justify="space-between" align="center" mb={2}>
                      <Text
                        fontSize="xs"
                        fontWeight="semibold"
                        color="fg.muted"
                        textTransform="uppercase"
                        letterSpacing="wider"
                      >
                        Dashboards
                      </Text>
                      <Button
                        size="2xs"
                        variant="outline"
                        onClick={() => setMode("newDashboard")}
                      >
                        <MapPinPlusIcon size={12} />
                        New dashboard
                      </Button>
                    </Flex>
                    {sortedDashboards.length === 0 ? (
                      <Text fontSize="xs" color="fg.muted" px={2} py={2}>
                        No dashboards yet — create one for this AOI.
                      </Text>
                    ) : (
                      <VStack align="stretch" gap={1.5}>
                        {sortedDashboards.map((dashboard) => (
                          <Flex
                            key={dashboard.id}
                            align="center"
                            justify="space-between"
                            gap={3}
                            px={3}
                            py={2}
                            border="1px solid"
                            borderColor="border"
                            rounded="md"
                            _hover={{ borderColor: "border.emphasized" }}
                          >
                            <Flex align="center" gap={2} minW={0}>
                              <Box color="fg.muted">
                                <SquaresFourIcon size={14} />
                              </Box>
                              <Box minW={0}>
                                <Text fontSize="sm" fontWeight="medium" truncate>
                                  {dashboard.name}
                                </Text>
                                <Text fontSize="xs" color="fg.muted">
                                  {dashboard.aoi.name}
                                </Text>
                              </Box>
                            </Flex>
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() =>
                                handleAddToDashboard(
                                  dashboard.id,
                                  dashboard.name
                                )
                              }
                            >
                              Add
                            </Button>
                          </Flex>
                        ))}
                      </VStack>
                    )}
                  </Box>
                </VStack>
              )}

              {mode === "newReport" && (
                <VStack align="stretch" gap={3}>
                  <Field.Root>
                    <Field.Label>Report name</Field.Label>
                    <Input
                      placeholder="e.g. Amazon Restoration Q2"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      autoFocus
                    />
                  </Field.Root>
                  <Flex gap={2} justify="flex-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setNewName("");
                        setMode("pick");
                      }}
                    >
                      Back
                    </Button>
                    <Button
                      size="sm"
                      colorPalette="primary"
                      onClick={handleCreateNewReport}
                    >
                      Create and add
                    </Button>
                  </Flex>
                </VStack>
              )}

              {mode === "newDashboard" && (
                <VStack align="stretch" gap={3}>
                  <Field.Root>
                    <Field.Label>Dashboard name</Field.Label>
                    <Input
                      placeholder={pendingPin?.aoi.name ?? "Dashboard name"}
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      autoFocus
                    />
                    <Field.HelperText>
                      Seeded with this insight for{" "}
                      <Box as="span" fontWeight="medium">
                        {pendingPin?.aoi.name}
                      </Box>
                      .
                    </Field.HelperText>
                  </Field.Root>
                  <Flex gap={2} justify="flex-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setNewName("");
                        setMode("pick");
                      }}
                    >
                      Back
                    </Button>
                    <Button
                      size="sm"
                      colorPalette="primary"
                      onClick={handleCreateNewDashboard}
                    >
                      Create and add
                    </Button>
                  </Flex>
                </VStack>
              )}
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
