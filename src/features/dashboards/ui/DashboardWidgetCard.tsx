"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  Flex,
  Icon,
  IconButton,
  Portal,
  Text,
} from "@chakra-ui/react";
import {
  ArrowsOutLineHorizontalIcon,
  ChartBarIcon,
  ChatTeardropDotsIcon,
  DotsSixVerticalIcon,
  XIcon,
} from "@phosphor-icons/react";

import WidgetMessage from "@/app/components/WidgetMessage";
import AnalysisParametersToggle, {
  AnalysisParamsChips,
} from "@/app/components/widgets/AnalysisParameters";
import { buildChips } from "@/app/components/widgets/analysis-params-utils";
import { toaster } from "@/app/components/ui/toaster";
import type { InsightWidget } from "@/app/types/chat";

/**
 * One dashboard card — the Figma "Analysis" container: a light-blue shell
 * with a header row (drag handle · insight title · owner actions), a
 * "Show params" row, and the white chart card (`WidgetMessage`) inside.
 * A widget whose insight has several charts renders one of these per chart,
 * so `card` is a single insight card, not a list. Header actions still act
 * on the underlying widget (per the API: position/config/DELETE are
 * widget-level), which `chartCount` lets the remove dialog explain.
 */
export default function DashboardWidgetCard({
  title,
  card,
  placeholder,
  chartCount,
  isOwner,
  isDouble,
  onArmDrag,
  onDisarmDrag,
  onToggleSize,
  onRemove,
}: {
  title: string;
  /** The insight card to render, or null for a placeholder cell. */
  card: InsightWidget | null;
  /** Placeholder copy when `card` is null (unsupported type / hidden insight). */
  placeholder: string | null;
  /** How many cards the underlying widget renders in total (its chart count). */
  chartCount: number;
  isOwner: boolean;
  isDouble: boolean;
  /** Pointer down on the drag handle — arms the grid item's HTML5 drag. */
  onArmDrag: () => void;
  onDisarmDrag: () => void;
  onToggleSize: () => void;
  onRemove: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [paramsExpanded, setParamsExpanded] = useState(false);
  const chips = card?.analysisParams ? buildChips(card.analysisParams) : [];

  const addToConversation = () => {
    // False door — measure interest before building the real flow.
    toaster.create({
      title: "Coming soon",
      description:
        "Adding a widget to the AI conversation isn't available yet.",
      type: "info",
      duration: 3000,
    });
  };

  return (
    <Flex
      flexDir="column"
      h="100%"
      bg="#F7F9FF"
      borderWidth="1px"
      borderColor="#DDE2F5"
      borderRadius="sm"
      overflow="hidden"
    >
      {/* Header — drag handle · title · actions (per the Figma LegendItemHeader) */}
      <Flex align="center" gap="4px" pl="4px" pr="12px" pt="12px" pb="8px">
        {isOwner && (
          <Icon
            as={DotsSixVerticalIcon}
            boxSize="16px"
            color="fg.muted"
            cursor="grab"
            flexShrink={0}
            aria-label="Drag to reposition"
            onPointerDown={onArmDrag}
            onPointerUp={onDisarmDrag}
          />
        )}
        <Text
          flex="1"
          minW={0}
          fontSize="14px"
          fontWeight="medium"
          lineHeight="16px"
          color="#172B7A"
          wordBreak="break-word"
          pl={isOwner ? 0 : "8px"}
        >
          {title}
        </Text>
        {isOwner && (
          <Flex align="center" gap="4px" flexShrink={0}>
            <IconButton
              aria-label="Add to AI conversation"
              title="Add to AI conversation"
              size="2xs"
              variant="ghost"
              color="fg.muted"
              onClick={addToConversation}
            >
              <ChatTeardropDotsIcon size={16} />
            </IconButton>
            <IconButton
              aria-label={
                isDouble ? "Shrink to one column" : "Expand to full width"
              }
              title={isDouble ? "Shrink to one column" : "Expand to full width"}
              size="2xs"
              variant="ghost"
              color="fg.muted"
              onClick={onToggleSize}
            >
              <ArrowsOutLineHorizontalIcon size={16} />
            </IconButton>
            <IconButton
              aria-label="Remove from dashboard"
              title="Remove from dashboard"
              size="2xs"
              variant="ghost"
              color="fg.muted"
              onClick={() => setConfirmOpen(true)}
            >
              <XIcon size={16} />
            </IconButton>
          </Flex>
        )}
      </Flex>

      {/* Params row — "Show params" toggle over the analysis param chips */}
      {chips.length > 0 && (
        <Box px="8px" pb="8px">
          <Flex
            borderTopWidth="1px"
            borderColor="rgba(19,22,25,0.05)"
            pt="4px"
            align="center"
          >
            <AnalysisParametersToggle
              expanded={paramsExpanded}
              onToggle={() => setParamsExpanded((v) => !v)}
            />
          </Flex>
          {paramsExpanded && (
            <Box pt="8px">
              <AnalysisParamsChips chips={chips} />
            </Box>
          )}
        </Box>
      )}

      {placeholder ? (
        <Flex
          flex="1"
          minH="160px"
          align="center"
          justify="center"
          direction="column"
          gap={2}
          color="fg.muted"
          px={6}
          textAlign="center"
        >
          <ChartBarIcon size={24} />
          <Text fontSize="sm">{placeholder}</Text>
        </Flex>
      ) : (
        card && (
          <Box px="8px" pb="8px" flex="1" minW={0}>
            <WidgetMessage widget={card} inWorkspace />
          </Box>
        )
      )}

      <Dialog.Root
        open={confirmOpen}
        onOpenChange={(e) => setConfirmOpen(e.open)}
        size="sm"
        role="alertdialog"
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>Remove widget?</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <Text>
                  {chartCount > 1
                    ? `This analysis has ${chartCount} charts shown as separate cards — removing it removes all of them. The underlying analysis is not deleted.`
                    : "The widget will be removed from this dashboard. The underlying analysis is not deleted."}
                </Text>
              </Dialog.Body>
              <Dialog.Footer>
                <Dialog.ActionTrigger asChild>
                  <Button variant="outline" size="sm">
                    Cancel
                  </Button>
                </Dialog.ActionTrigger>
                <Button
                  colorPalette="red"
                  size="sm"
                  onClick={() => {
                    setConfirmOpen(false);
                    onRemove();
                  }}
                >
                  Remove
                </Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </Flex>
  );
}
