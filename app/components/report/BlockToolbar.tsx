"use client";

import { useState } from "react";
import { Flex, IconButton, Text, Box, Button } from "@chakra-ui/react";
import {
  TrashIcon,
  ArrowsOutSimpleIcon,
  ArrowsInSimpleIcon,
  ChatCircleIcon,
  DotsSixVerticalIcon,
  PushPinSlashIcon,
  XIcon,
  CheckIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { Tooltip } from "@/app/components/ui/tooltip";
import { ReportBlock as ReportBlockType } from "@/app/types/report";
import useReportStore from "@/app/store/reportStore";

interface Props {
  block: ReportBlockType;
  reportId: string;
  /** Ref callback from useSortable for the drag handle */
  dragHandleRef?: (element: Element | null) => void;
  /** Whether to show the toolbar (controlled by parent hover state) */
  visible: boolean;
}

export default function BlockToolbar({
  block,
  reportId,
  dragHandleRef,
  visible,
}: Props) {
  const { removeBlock, resizeBlock } = useReportStore();
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  const isInsight = block.kind === "insight";
  const isFull = (block.size ?? "full") === "full";

  const sourceThreadId = block.widget?.sourceThreadId;
  const sourceMessageId = block.widget?.sourceMessageId;
  // sourceThreadId might be empty string from older pins — treat as unavailable
  const hasSource = !!sourceThreadId && sourceThreadId.length > 0;
  const sourceHref = hasSource
    ? `/app/threads/${sourceThreadId}${sourceMessageId ? `#msg-${sourceMessageId}` : ""}`
    : null;

  const handleToggleSize = () => {
    resizeBlock(reportId, block.id, isFull ? "half" : "full");
  };

  const handleRemoveClick = () => {
    if (!confirmingRemove) {
      setConfirmingRemove(true);
      return;
    }
    removeBlock(reportId, block.id);
  };

  const handleCancelRemove = () => {
    setConfirmingRemove(false);
  };

  return (
    <Flex
      opacity={visible ? 1 : 0}
      transition="opacity 0.15s"
      pointerEvents={visible ? "auto" : "none"}
      gap={0}
      align="center"
      bg="bg"
      border="1px solid"
      borderColor="border.muted"
      rounded="md"
      shadow="sm"
      h={7}
      px={0.5}
      mb={1}
      w="fit-content"
      mx="auto"
    >
      {/* Drag handle */}
      <Tooltip content="Drag to reorder" positioning={{ placement: "top" }}>
        <Box
          ref={dragHandleRef}
          display="flex"
          alignItems="center"
          justifyContent="center"
          cursor="grab"
          px={1}
          color="fg.subtle"
          _hover={{ color: "fg.muted" }}
          _active={{ cursor: "grabbing" }}
          h="full"
        >
          <DotsSixVerticalIcon size={16} />
        </Box>
      </Tooltip>

      <Box w="1px" h={4} bg="border.muted" flexShrink={0} />

      {/* Source chat thread link (insight blocks only) */}
      {isInsight && sourceHref && (
        <Tooltip
          content="Go to the chat thread where this insight was created"
          positioning={{ placement: "top" }}
        >
          <Button
            asChild
            variant="ghost"
            size="2xs"
            color="fg.muted"
            _hover={{ color: "fg" }}
            px={1.5}
            h={6}
            fontSize="2xs"
          >
            <Link href={sourceHref}>
              <ChatCircleIcon size={14} />
              Source chat
            </Link>
          </Button>
        </Tooltip>
      )}
      {isInsight && !sourceHref && (
        <Tooltip
          content="The original chat thread is no longer available"
          positioning={{ placement: "top" }}
        >
          <Flex align="center" gap={1} px={1.5} opacity={0.4}>
            <ChatCircleIcon size={14} />
            <Text fontSize="2xs" color="fg.subtle">
              Source unavailable
            </Text>
          </Flex>
        </Tooltip>
      )}

      {isInsight && (
        <Box w="1px" h={4} bg="border.muted" flexShrink={0} />
      )}

      {/* Resize toggle */}
      <Tooltip
        content={isFull ? "Half width" : "Full width"}
        positioning={{ placement: "top" }}
      >
        <IconButton
          variant="ghost"
          size="2xs"
          onClick={handleToggleSize}
          aria-label={isFull ? "Half width" : "Full width"}
          color="fg.muted"
          _hover={{ color: "fg" }}
        >
          {isFull ? (
            <ArrowsInSimpleIcon size={16} />
          ) : (
            <ArrowsOutSimpleIcon size={16} />
          )}
        </IconButton>
      </Tooltip>

      <Box w="1px" h={4} bg="border.muted" flexShrink={0} />

      {/* Remove / Unpin */}
      {confirmingRemove ? (
        <Flex align="center" gap={0} px={1}>
          <Text fontSize="2xs" color="fg.muted" whiteSpace="nowrap" mr={1}>
            {isInsight ? "Unpin?" : "Remove?"}
          </Text>
          <Tooltip content="Confirm" positioning={{ placement: "top" }}>
            <IconButton
              variant="ghost"
              size="2xs"
              colorPalette="red"
              onClick={handleRemoveClick}
              aria-label="Confirm remove"
            >
              <CheckIcon size={14} weight="bold" />
            </IconButton>
          </Tooltip>
          <Tooltip content="Cancel" positioning={{ placement: "top" }}>
            <IconButton
              variant="ghost"
              size="2xs"
              onClick={handleCancelRemove}
              aria-label="Cancel remove"
              color="fg.muted"
            >
              <XIcon size={14} />
            </IconButton>
          </Tooltip>
        </Flex>
      ) : (
        <Tooltip
          content={isInsight ? "Unpin from report" : "Remove block"}
          positioning={{ placement: "top" }}
        >
          <IconButton
            variant="ghost"
            size="2xs"
            onClick={handleRemoveClick}
            aria-label={isInsight ? "Unpin insight" : "Remove block"}
            color="fg.muted"
            _hover={{ color: "red.fg" }}
          >
            {isInsight ? (
              <PushPinSlashIcon size={16} />
            ) : (
              <TrashIcon size={16} />
            )}
          </IconButton>
        </Tooltip>
      )}
    </Flex>
  );
}
