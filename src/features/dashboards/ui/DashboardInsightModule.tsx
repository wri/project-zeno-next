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
  CaretDownIcon,
  ChartBarIcon,
  DotsSixVerticalIcon,
  XIcon,
} from "@phosphor-icons/react";

import InsightCaption from "@/app/components/InsightCaption";
import type { InsightWidget } from "@/app/types/chat";
import type { Dashboard, DashboardWidget } from "../api/schemas";
import { packCells } from "../lib/packing";
import {
  chartSize,
  insightModule,
  withChartHidden,
  withChartSize,
  withChartTitle,
} from "../lib/widgets";
import { TWO_COLUMN_QUERY } from "./gridLayout";
import DashboardWidgetCard from "./DashboardWidgetCard";

/**
 * One insight rendered as a grouped module — the design's "analysis" section:
 * a header row (drag handle · title · owner actions), the insight narrative
 * with its AI badge, then the insight's chart cards packed into the same
 * two-column layout the grid uses between widgets. The module always spans
 * the full grid width; charts keep their per-chart spans inside it.
 *
 * Mutation-agnostic on purpose: every config edit flows through
 * `onUpdateConfig` with a full config built by the `with*` helpers (the
 * backend replaces config whole), and `onRemove` deletes the widget. The
 * grid wires both to the optimistic dashboard mutations.
 */
export default function DashboardInsightModule({
  widget,
  areaAoi,
  isOwner,
  onArmDrag,
  onDisarmDrag,
  onUpdateConfig,
  onRemove,
}: {
  widget: DashboardWidget;
  /** The dashboard's area — feeds each card's AREA param chip. */
  areaAoi?: Dashboard["aois"][number];
  isOwner: boolean;
  /** Pointer down on the header drag handle — arms the grid item's HTML5 drag. */
  onArmDrag: () => void;
  onDisarmDrag: () => void;
  /** Persist a widget config change (the full config to PATCH). */
  onUpdateConfig: (config: Record<string, unknown>) => void;
  /** Remove the whole widget (module) from the dashboard. */
  onRemove: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const vm = insightModule(widget, { areaName: areaAoi?.name });
  const showSummary = vm.summaryShown && vm.summaryText.length > 0;
  const hasCharts = vm.allCharts.length > 0;
  const allChartIds = vm.allCharts.map((c) => c.id);

  // Charts pack into the same segment layout as the grid: full-width spans
  // get their own row, half-width runs deal into two tight columns.
  const segments = packCells(
    vm.cards,
    (card) => !!card.id && chartSize(widget.config, card.id) === "double"
  );

  const renderCard = (card: InsightWidget, order: number) => {
    const isDouble =
      !!card.id && chartSize(widget.config, card.id) === "double";
    return (
      <Box
        key={card.id ?? order}
        minW={0}
        css={{ order, [TWO_COLUMN_QUERY]: { order: 0 } }}
      >
        <DashboardWidgetCard
          title={card.title}
          card={card}
          placeholder={null}
          chartCount={vm.cards.length}
          isOwner={isOwner}
          isDouble={isDouble}
          // A chart's drag handle moves the whole module (reordering is
          // widget-level; cards stay adjacent).
          onArmDrag={onArmDrag}
          onDisarmDrag={onDisarmDrag}
          onToggleSize={() =>
            card.id &&
            onUpdateConfig(
              withChartSize(
                widget.config,
                card.id,
                isDouble ? "single" : "double"
              )
            )
          }
          onRename={(name) =>
            card.id &&
            onUpdateConfig(withChartTitle(widget.config, card.id, name))
          }
          onRemove={() =>
            card.id &&
            onUpdateConfig(withChartHidden(widget.config, card.id, allChartIds))
          }
        />
      </Box>
    );
  };

  return (
    <Flex
      flexDir="column"
      bg="white"
      borderWidth="1px"
      borderColor="border.muted"
      borderRadius="md"
      px="16px"
      py="12px"
      gap="12px"
    >
      {/* Header — drag handle · collapse · title · owner actions */}
      <Flex align="center" gap="4px" minW={0}>
        {isOwner && (
          <Icon
            as={DotsSixVerticalIcon}
            boxSize="16px"
            color="fg.muted"
            cursor="grab"
            flexShrink={0}
            aria-label="Drag to reposition analysis"
            onPointerDown={onArmDrag}
            onPointerUp={onDisarmDrag}
          />
        )}
        <IconButton
          aria-label={collapsed ? "Expand analysis" : "Collapse analysis"}
          title={collapsed ? "Expand analysis" : "Collapse analysis"}
          size="2xs"
          variant="ghost"
          color="fg.muted"
          flexShrink={0}
          onClick={() => setCollapsed((v) => !v)}
        >
          <CaretDownIcon
            size={16}
            style={{
              transform: collapsed ? "rotate(-90deg)" : undefined,
              transition: "transform 0.15s",
            }}
          />
        </IconButton>
        <Text
          flex="1"
          minW={0}
          fontSize="16px"
          fontWeight="semibold"
          lineHeight="20px"
          color="fg"
          wordBreak="break-word"
        >
          {vm.title}
        </Text>
        {isOwner && (
          <Flex align="center" gap="4px" flexShrink={0}>
            <IconButton
              aria-label="Remove analysis from dashboard"
              title="Remove analysis from dashboard"
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

      {!collapsed && (
        <>
          {showSummary && (
            <Flex direction="column" gap="4px">
              <Text fontSize="14px" lineHeight="20px" color="fg">
                {vm.summaryText}
              </Text>
              <InsightCaption curated={false} showLearnMore={false} />
            </Flex>
          )}

          {!hasCharts ? (
            <Flex
              minH="120px"
              align="center"
              justify="center"
              direction="column"
              gap={2}
              color="fg.muted"
              px={6}
              textAlign="center"
            >
              <ChartBarIcon size={24} />
              <Text fontSize="sm">This analysis is not available.</Text>
            </Flex>
          ) : vm.cards.length === 0 ? (
            // Everything unchecked: keep a hint for owners so the module
            // stays discoverable; viewers just see the header (and summary,
            // when shown).
            !showSummary &&
            (isOwner ? (
              <Text fontSize="sm" color="fg.muted">
                All content in this analysis is hidden — use Customize to show
                it.
              </Text>
            ) : null)
          ) : (
            <Flex direction="column" gap={4} align="stretch">
              {segments.map((segment) =>
                segment.kind === "full" ? (
                  renderCard(segment.cell.item, segment.cell.index)
                ) : (
                  <Flex
                    key={`columns-${segment.left[0]?.item.id ?? "empty"}`}
                    gap={4}
                    align="flex-start"
                    display="contents"
                    css={{ [TWO_COLUMN_QUERY]: { display: "flex" } }}
                  >
                    {[segment.left, segment.right].map((column, side) => (
                      <Flex
                        key={side === 0 ? "left" : "right"}
                        direction="column"
                        gap={4}
                        flex="1"
                        minW={0}
                        display="contents"
                        css={{ [TWO_COLUMN_QUERY]: { display: "flex" } }}
                      >
                        {column.map((packed) =>
                          renderCard(packed.item, packed.index)
                        )}
                      </Flex>
                    ))}
                  </Flex>
                )
              )}
            </Flex>
          )}
        </>
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
                <Dialog.Title>Remove analysis?</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <Text>
                  All its charts and summary are removed from this dashboard.
                  The underlying analysis is not deleted.
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
