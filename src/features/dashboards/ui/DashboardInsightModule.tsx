"use client";

import { useState } from "react";
import { Box, Flex, Icon, IconButton, Text } from "@chakra-ui/react";
import {
  CaretDownIcon,
  ChartBarIcon,
  DotsSixVerticalIcon,
  XIcon,
} from "@phosphor-icons/react";

import type { InsightWidget } from "@/app/types/chat";
import type { Dashboard, DashboardWidget } from "../api/schemas";
import { packCells } from "../lib/packing";
import {
  chartSize,
  hasWidgetCustomization,
  insightModule,
  withChartHidden,
  withChartShown,
  withChartSize,
  withChartTitle,
  withSummaryShown,
} from "../lib/widgets";
import { TWO_COLUMN_QUERY } from "./gridLayout";
import DashboardModuleCustomizeMenu from "./DashboardModuleCustomizeMenu";
import DashboardWidgetCard from "./DashboardWidgetCard";
import RemoveAnalysisDialog from "./RemoveAnalysisDialog";

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
          // Inside a module the card's X hides the chart (withChartHidden);
          // only the module header's X removes the widget.
          removeMode="chart"
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
    // The design's floating module card: white on the page's gray background,
    // no border or shadow — separation comes from the contrast and the grid's
    // vertical gaps (prototype .panel: radius 8, padding 20/24/24).
    <Flex
      flexDir="column"
      bg="white"
      borderRadius="8px"
      px="24px"
      pt="20px"
      pb="24px"
      gap="24px"
    >
      {/* Header — drag handle · collapse · title · owner actions, over the
          design's full-width divider */}
      <Flex
        align="center"
        gap="4px"
        minW={0}
        // The divider separates the header from the module body, so a
        // collapsed module is just the header row.
        borderBottom={collapsed ? "none" : "1px solid"}
        borderColor="#E0E2E5"
        pb={collapsed ? 0 : "12px"}
      >
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
          fontSize="20px"
          fontWeight="normal"
          lineHeight="28px"
          color="fg"
          wordBreak="break-word"
        >
          {vm.title}
        </Text>
        {isOwner && (
          <Flex align="center" gap="4px" flexShrink={0}>
            <DashboardModuleCustomizeMenu
              summaryAvailable={vm.summaryText.length > 0}
              summaryShown={vm.summaryShown}
              charts={vm.allCharts}
              onToggleSummary={(shown) =>
                onUpdateConfig(withSummaryShown(widget.config, shown))
              }
              onToggleChart={(chartId, shown) =>
                onUpdateConfig(
                  shown
                    ? withChartShown(widget.config, chartId, allChartIds)
                    : withChartHidden(widget.config, chartId, allChartIds)
                )
              }
            />
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
            <Text fontSize="16px" lineHeight="24px" color="fg">
              {vm.summaryText}{" "}
              {/* Inline "AI generated" chip per the design, riding at the
                  end of the narrative. */}
              <Box
                as="span"
                display="inline-block"
                px="4px"
                borderRadius="4px"
                bg="#D7DFF2"
                color="#3855A3"
                fontSize="10px"
                fontFamily="mono"
                lineHeight="16px"
                verticalAlign="2px"
                whiteSpace="nowrap"
              >
                AI generated
              </Box>
            </Text>
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

      <RemoveAnalysisDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        customized={hasWidgetCustomization(widget.config)}
        onConfirm={onRemove}
      />
    </Flex>
  );
}
