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
import { toaster } from "@/app/components/ui/toaster";
import type { DashboardWidget } from "../api/schemas";
import { dashboardWidgetToInsightWidgets, widgetSize } from "../lib/widgets";

/**
 * One dashboard widget: a control strip (drag / add-to-conversation /
 * resize / remove, owner-only) over the insight cards rendered by the
 * existing WidgetMessage. Per the Figma AI-widget header, controls are:
 * DotsSixVertical, ChatTeardropDots, ArrowsOutLineHorizontal, X.
 */
export default function DashboardWidgetCard({
  widget,
  isOwner,
  onArmDrag,
  onDisarmDrag,
  onToggleSize,
  onRemove,
}: {
  widget: DashboardWidget;
  isOwner: boolean;
  /** Pointer down on the drag handle — arms the grid item's HTML5 drag. */
  onArmDrag: () => void;
  onDisarmDrag: () => void;
  onToggleSize: () => void;
  onRemove: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const size = widgetSize(widget.config);
  const cards =
    widget.widget_type === "insight"
      ? dashboardWidgetToInsightWidgets(widget)
      : [];

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

  const placeholder =
    widget.widget_type !== "insight"
      ? `This ${widget.widget_type} widget isn't supported here yet.`
      : cards.length === 0
        ? "This analysis is not available."
        : null;

  return (
    <Flex
      flexDir="column"
      h="100%"
      bg="bg"
      borderWidth="1px"
      borderColor="border"
      borderRadius="sm"
      overflow="hidden"
    >
      <Flex
        align="center"
        gap={1}
        px={2}
        py={1}
        borderBottomWidth="1px"
        borderColor="border"
        bg="bg.subtle"
      >
        {isOwner && (
          <Icon
            as={DotsSixVerticalIcon}
            boxSize="16px"
            color="fg.muted"
            cursor="grab"
            aria-label="Drag to reposition"
            onPointerDown={onArmDrag}
            onPointerUp={onDisarmDrag}
          />
        )}
        <Box flex="1" />
        {isOwner && (
          <>
            <IconButton
              aria-label="Add to AI conversation"
              title="Add to AI conversation"
              size="2xs"
              variant="ghost"
              color="fg.muted"
              onClick={addToConversation}
            >
              <ChatTeardropDotsIcon size={14} />
            </IconButton>
            <IconButton
              aria-label={
                size === "double"
                  ? "Shrink to one column"
                  : "Expand to full width"
              }
              title={
                size === "double"
                  ? "Shrink to one column"
                  : "Expand to full width"
              }
              size="2xs"
              variant="ghost"
              color="fg.muted"
              onClick={onToggleSize}
            >
              <ArrowsOutLineHorizontalIcon size={14} />
            </IconButton>
            <IconButton
              aria-label="Remove from dashboard"
              title="Remove from dashboard"
              size="2xs"
              variant="ghost"
              color="fg.muted"
              onClick={() => setConfirmOpen(true)}
            >
              <XIcon size={14} />
            </IconButton>
          </>
        )}
      </Flex>

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
        <Box px={2} pt={2} pb={2} flex="1" minW={0}>
          {cards.map((card) => (
            <WidgetMessage key={card.id} widget={card} inWorkspace />
          ))}
        </Box>
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
                  The widget will be removed from this dashboard. The underlying
                  analysis is not deleted.
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
