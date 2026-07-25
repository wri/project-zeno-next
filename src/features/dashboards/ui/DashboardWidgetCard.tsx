"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  Flex,
  Icon,
  IconButton,
  Input,
  Portal,
  Text,
} from "@chakra-ui/react";
import {
  ArrowsOutLineHorizontalIcon,
  ChartBarIcon,
  ChatTeardropDotsIcon,
  DotsSixVerticalIcon,
  PencilSimpleIcon,
  XIcon,
} from "@phosphor-icons/react";

import WidgetMessage from "@/app/components/WidgetMessage";
import AnalysisParametersToggle, {
  AnalysisParamsChips,
} from "@/app/components/widgets/AnalysisParameters";
import { buildChips } from "@/app/components/widgets/analysis-params-utils";
import { toaster } from "@/app/components/ui/toaster";
import type { InsightWidget } from "@/app/types/chat";
import type { MapWidgetLayer } from "../lib/mapWidgets";
import DashboardMapWidget from "./DashboardMapWidget";

/**
 * One dashboard card — the Figma "Analysis" container: a light-blue shell
 * with a header row (drag handle · insight title · owner actions), a
 * "Show params" row, and the white chart card (`WidgetMessage`) — or the
 * map body (`DashboardMapWidget`) for map widgets — inside.
 * A widget whose insight has several charts renders one of these per chart,
 * so `card` is a single insight card, not a list. Header actions still act
 * on the underlying widget (per the API: position/config/DELETE are
 * widget-level), which `chartCount` lets the remove dialog explain.
 *
 * In report mode the shell dissolves (transparent, borderless), the title
 * restyles as a document heading, and the params row goes — only the content
 * (chart, table, map) remains, still hover-interactive.
 */
export default function DashboardWidgetCard({
  title,
  card,
  map,
  aoi,
  viewportBbox,
  placeholder,
  chartCount,
  canEdit,
  isReport,
  isDouble,
  onArmDrag,
  onDisarmDrag,
  onToggleSize,
  onRename,
  onRemove,
}: {
  title: string;
  /** The insight card to render, or null for a map/text/placeholder cell. */
  card: InsightWidget | null;
  /** The map layer to render for `widget_type: "map"` cells. */
  map?: MapWidgetLayer | null;
  /** The dashboard's area — outline, label + viewport fit for map cells. */
  aoi?: { source: string; src_id: string; name: string };
  /** Reserved `config.viewport` bbox override for map cells. */
  viewportBbox?: [number, number, number, number] | null;
  /** Placeholder copy when `card` is null (unsupported type / hidden insight). */
  placeholder: string | null;
  /** How many cards the underlying widget renders in total (its chart count). */
  chartCount: number;
  /** Owner in edit mode — gates every editing affordance. */
  canEdit: boolean;
  /** Report mode: shell dissolves, title becomes a document heading. */
  isReport: boolean;
  isDouble: boolean;
  /** Pointer down on the drag handle — arms the grid item's HTML5 drag. */
  onArmDrag: () => void;
  onDisarmDrag: () => void;
  onToggleSize: () => void;
  /** Persist a manual title (blank reverts to default); omitted disables rename. */
  onRename?: (name: string) => void;
  onRemove: () => void;
}) {
  // Report mode restyles the widget title as a document heading — stronger
  // ink, no card-blue — since the shell around it is gone.
  const titleStyle = isReport
    ? {
        fontSize: "15px",
        fontWeight: "semibold",
        lineHeight: "20px",
        color: "#131619",
      }
    : {
        fontSize: "14px",
        fontWeight: "medium",
        lineHeight: "16px",
        color: "#172B7A",
      };
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [paramsExpanded, setParamsExpanded] = useState(false);
  // null = not editing; a string is the in-progress title draft.
  const [draft, setDraft] = useState<string | null>(null);
  const editing = draft !== null;
  // The value just committed by a rename. The optimistic update lands a tick
  // after we leave edit mode, so without this the label would paint one frame
  // of the stale `title` prop — a visible flash. Held until the prop catches
  // up, then dropped during render (below).
  const [pending, setPending] = useState<string | null>(null);

  // Render-phase reconciliation: once the prop reflects the saved name (or a
  // fresh server value arrives, e.g. an error rollback), drop the override so
  // the prop is authoritative again. Runs before paint — no flash, no effect.
  if (pending !== null && title.trim() === pending) setPending(null);
  const displayTitle = pending ?? title;
  const chips = card?.analysisParams ? buildChips(card.analysisParams) : [];

  const commitRename = () => {
    const next = (draft ?? "").trim();
    setDraft(null);
    // Blank clears the override (revert to default); skip a no-op rename.
    if (next === title.trim()) return;
    // Blank reverts to a default this component can't compute, so only hold a
    // concrete new name to bridge the optimistic-update gap.
    if (next) setPending(next);
    onRename?.(next);
  };

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
      bg={isReport ? "transparent" : "#F7F9FF"}
      borderWidth="1px"
      borderColor={isReport ? "transparent" : "#DDE2F5"}
      borderRadius="sm"
      overflow="hidden"
    >
      {/* Header — drag handle · title · actions (per the Figma LegendItemHeader) */}
      <Flex align="center" gap="4px" pl="4px" pr="12px" pt="12px" pb="8px">
        {canEdit && (
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
        {editing ? (
          <Input
            flex="1"
            minW={0}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") setDraft(null);
            }}
            autoFocus
            aria-label="Widget title"
            variant="flushed"
            size="sm"
            fontSize="14px"
            fontWeight="medium"
            color="#172B7A"
            pl={canEdit ? 0 : "8px"}
          />
        ) : (
          <Text
            flex="1"
            minW={0}
            {...titleStyle}
            wordBreak="break-word"
            pl={canEdit ? 0 : "8px"}
          >
            {displayTitle}
          </Text>
        )}
        {canEdit && (
          <Flex align="center" gap="4px" flexShrink={0}>
            {onRename && !editing && (
              <IconButton
                aria-label="Rename widget"
                title="Rename widget"
                size="2xs"
                variant="ghost"
                color="fg.muted"
                onClick={() => setDraft(displayTitle)}
              >
                <PencilSimpleIcon size={16} />
              </IconButton>
            )}
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

      {/* Params row — "Show params" toggle over the analysis param chips.
          An inspection affordance, not content — absent from the report. */}
      {!isReport && chips.length > 0 && (
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
      ) : map ? (
        <Box px="8px" pb="8px" flex="1" minW={0}>
          <DashboardMapWidget
            layer={map}
            aoi={aoi}
            bboxOverride={viewportBbox ?? null}
            tall={isDouble}
            interactive={!isReport}
          />
        </Box>
      ) : (
        card && (
          <Box px="8px" pb="8px" flex="1" minW={0}>
            <WidgetMessage
              widget={card}
              variant={isReport ? "report" : "workspace"}
            />
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
                <Dialog.Title>
                  {chartCount > 1 ? "Remove chart?" : "Remove widget?"}
                </Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <Text>
                  {chartCount > 1
                    ? "Only this chart is removed from the dashboard — the analysis's other charts stay, and the underlying analysis is not deleted."
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
