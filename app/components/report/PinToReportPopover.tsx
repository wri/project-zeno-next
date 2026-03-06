"use client";

import { useState, useMemo } from "react";
import {
  Button,
  Popover,
  Portal,
  Stack,
  Text,
  Flex,
  Badge,
} from "@chakra-ui/react";
import {
  PushPinIcon,
  PlusIcon,
  CheckCircleIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { InsightWidget } from "@/app/types/chat";
import useReportStore from "@/app/store/reportStore";
import useChatStore from "@/app/store/chatStore";
import { toaster } from "@/app/components/ui/toaster";

interface Props {
  widget: InsightWidget;
  traceId?: string;
  messageId?: string;
}

export default function PinToReportPopover({
  widget,
  traceId,
  messageId,
}: Props) {
  const { reports, pinWidget, createReport } = useReportStore();
  const { currentThreadId } = useChatStore();
  const [open, setOpen] = useState(false);
  /** Report ID that was just pinned to — for showing inline confirmation */
  const [justPinnedTo, setJustPinnedTo] = useState<string | null>(null);

  /**
   * Set of report IDs that already contain this exact widget.
   * Matches on widget title + type + source messageId (if available).
   */
  const alreadyPinnedIn = useMemo(() => {
    const set = new Set<string>();
    for (const r of reports) {
      for (const b of r.blocks) {
        if (b.kind !== "insight" || !b.widget) continue;
        const w = b.widget;
        const titleMatch = w.title === widget.title && w.type === widget.type;
        // If we have a messageId, use it as a stricter match
        const msgMatch = messageId
          ? w.sourceMessageId === messageId
          : true;
        if (titleMatch && msgMatch) {
          set.add(r.id);
          break;
        }
      }
    }
    return set;
  }, [reports, widget.title, widget.type, messageId]);

  const handlePin = (reportId: string) => {
    const reportTitle = pinWidget(
      reportId,
      widget,
      currentThreadId ?? "",
      traceId,
      messageId
    );
    if (!reportTitle) {
      toaster.create({
        title: "Report is full",
        description: "A report can hold up to 20 chart/table widgets.",
        type: "warning",
        duration: 4000,
      });
      return;
    }

    setJustPinnedTo(reportId);

    toaster.create({
      title: `Pinned to "${reportTitle}"`,
      description: (
        <Text asChild fontSize="xs">
          <Link href={`/app/report-builder/${reportId}`}>
            Open report →
          </Link>
        </Text>
      ),
      type: "success",
      duration: 4000,
    });

    // Auto-close popover after brief confirmation
    setTimeout(() => {
      setOpen(false);
      setJustPinnedTo(null);
    }, 600);
  };

  const handleCreateAndPin = () => {
    const id = createReport();
    handlePin(id);
  };

  return (
    <Popover.Root
      positioning={{ placement: "bottom-end" }}
      open={open}
      onOpenChange={(e) => {
        setOpen(e.open);
        if (!e.open) setJustPinnedTo(null);
      }}
    >
      <Popover.Trigger asChild>
        <Button size="xs" variant="outline" h={6} rounded="sm">
          <PushPinIcon /> Pin to report
        </Button>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content maxW="280px">
            <Popover.Body>
              <Text
                fontSize="2xs"
                fontWeight="semibold"
                color="fg.muted"
                mb={2}
                textTransform="uppercase"
                letterSpacing="wide"
              >
                Select a report
              </Text>
              <Stack gap={1}>
                {reports.length === 0 && (
                  <Text fontSize="xs" color="fg.muted">
                    No reports yet — create one below.
                  </Text>
                )}
                {reports.map((r) => {
                  const isPinned = alreadyPinnedIn.has(r.id);
                  const wasJustPinned = justPinnedTo === r.id;

                  return (
                    <Button
                      key={r.id}
                      size="xs"
                      variant={wasJustPinned ? "solid" : "ghost"}
                      colorPalette={wasJustPinned ? "green" : undefined}
                      justifyContent="flex-start"
                      onClick={() => handlePin(r.id)}
                      disabled={justPinnedTo !== null}
                      w="full"
                    >
                      <Flex align="center" gap={1.5} w="full">
                        {wasJustPinned ? (
                          <CheckCircleIcon weight="fill" />
                        ) : isPinned ? (
                          <CheckCircleIcon
                            size={14}
                            weight="fill"
                            color="var(--chakra-colors-green-fg)"
                          />
                        ) : (
                          <PushPinIcon size={14} />
                        )}
                        <Text truncate fontSize="xs">
                          {r.title}
                        </Text>
                        {isPinned && !wasJustPinned && (
                          <Badge
                            size="xs"
                            colorPalette="green"
                            variant="subtle"
                            ml="auto"
                            flexShrink={0}
                          >
                            Pinned
                          </Badge>
                        )}
                        {!isPinned && !wasJustPinned && (
                          <Text
                            fontSize="2xs"
                            color="fg.muted"
                            ml="auto"
                            flexShrink={0}
                          >
                            {r.blocks.filter((b) => b.kind === "insight").length}{" "}
                            items
                          </Text>
                        )}
                      </Flex>
                    </Button>
                  );
                })}
                <Button
                  size="xs"
                  variant="outline"
                  onClick={handleCreateAndPin}
                  disabled={justPinnedTo !== null}
                >
                  <PlusIcon /> New report
                </Button>
              </Stack>
            </Popover.Body>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  );
}
