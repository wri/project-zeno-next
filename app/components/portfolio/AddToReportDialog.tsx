"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  Portal,
  Button,
  Box,
  Flex,
  Text,
  Input,
  Field,
  VStack,
  CloseButton,
  Separator,
} from "@chakra-ui/react";
import useReportStore from "@/app/store/reportStore";
import { REPORT_INSIGHT_LIMIT } from "@/app/types/portfolio";

type Props = {
  open: boolean;
  insightIds: string[];
  onClose: () => void;
  onAdded: (reportId: string, isNew: boolean) => void;
};

export default function AddToReportDialog({
  open,
  insightIds,
  onClose,
  onAdded,
}: Props) {
  const reports = useReportStore((s) => s.reports);
  const createReport = useReportStore((s) => s.createReport);
  const addInsightBlock = useReportStore((s) => s.addInsightBlock);
  const [mode, setMode] = useState<"pick" | "new">("pick");
  const [newName, setNewName] = useState("");

  const sortedReports = useMemo(
    () =>
      [...reports].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ),
    [reports]
  );

  function handleAddToExisting(reportId: string) {
    insightIds.forEach((id) => addInsightBlock(reportId, id));
    onAdded(reportId, false);
    reset();
  }

  function handleCreateNew() {
    const report = createReport(newName, insightIds);
    onAdded(report.id, true);
    reset();
  }

  function reset() {
    setMode("pick");
    setNewName("");
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(e) => {
        if (!e.open) {
          onClose();
          reset();
        }
      }}
      size="md"
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content p={5}>
            <Dialog.Header px={0} pt={0} pb={3}>
              <Dialog.Title fontSize="md" fontWeight="semibold">
                Add to report
              </Dialog.Title>
              <Dialog.CloseTrigger asChild position="absolute" top={3} right={3}>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body px={0}>
              <Text fontSize="xs" color="fg.muted" mb={3}>
                {insightIds.length} insight
                {insightIds.length === 1 ? "" : "s"} to add. Up to{" "}
                {REPORT_INSIGHT_LIMIT} insights per report.
              </Text>
              {mode === "pick" && (
                <VStack align="stretch" gap={2}>
                  {sortedReports.length === 0 && (
                    <Text fontSize="sm" color="fg.muted">
                      No reports yet — create your first one.
                    </Text>
                  )}
                  {sortedReports.map((report) => {
                    const willOverflow =
                      report.blocks.filter((b) => b.type === "insight").length +
                        insightIds.length >
                      REPORT_INSIGHT_LIMIT;
                    return (
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
                        <Box minW={0}>
                          <Text fontSize="sm" fontWeight="medium" truncate>
                            {report.name}
                          </Text>
                          <Text fontSize="xs" color="fg.muted">
                            {report.blocks.length} block
                            {report.blocks.length === 1 ? "" : "s"}
                            {willOverflow && " · over limit"}
                          </Text>
                        </Box>
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => handleAddToExisting(report.id)}
                        >
                          Add
                        </Button>
                      </Flex>
                    );
                  })}
                  <Separator my={2} />
                  <Button
                    size="sm"
                    colorPalette="primary"
                    onClick={() => setMode("new")}
                  >
                    + Create new report
                  </Button>
                </VStack>
              )}
              {mode === "new" && (
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
                      onClick={() => setMode("pick")}
                    >
                      Back
                    </Button>
                    <Button
                      size="sm"
                      colorPalette="primary"
                      onClick={handleCreateNew}
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
