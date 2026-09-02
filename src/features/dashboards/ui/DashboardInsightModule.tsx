"use client";

import { useState } from "react";
import { Flex, IconButton, Text } from "@chakra-ui/react";
import { ArrowArcLeftIcon, ArrowArcRightIcon } from "@phosphor-icons/react";

import InsightCaption from "@/app/components/InsightCaption";
import type { Dashboard, DashboardWidget } from "../api/schemas";
import {
  hasWidgetCustomization,
  insightModule,
  withChartShown,
  withChartHidden,
  withChartTitle,
  withSummaryShown,
} from "../lib/widgets";
import DashboardModuleCustomizeMenu from "./DashboardModuleCustomizeMenu";
import DashboardWidgetCard from "./DashboardWidgetCard";
import RemoveAnalysisDialog from "./RemoveAnalysisDialog";

/**
 * One insight rendered as a single dashboard card — the same light-blue shell
 * every other widget draws (`DashboardWidgetCard`), never a white panel of
 * its own: the white belongs to the section around it.
 *
 * An insight usually carries several charts. They page through one shell,
 * first chart first, the way the map workspace pages through analyses —
 * rather than dealing one card per chart into the grid, which made an
 * analysis outweigh every other widget on the page. The narrative rides above
 * the chart body as the card's `intro`; the pager is its `footer`.
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
  isDouble,
  onArmDrag,
  onToggleSize,
  onUpdateConfig,
  onRemove,
}: {
  widget: DashboardWidget;
  /** The dashboard's area — feeds the card's AREA param chip. */
  areaAoi?: Dashboard["aois"][number];
  isOwner: boolean;
  /** The card's persisted column span. */
  isDouble: boolean;
  /** Pointer down on the header drag handle — starts the grid's drag gesture. */
  onArmDrag: (event: React.PointerEvent) => void;
  onToggleSize: () => void;
  /** Persist a widget config change (the full config to PATCH). */
  onUpdateConfig: (config: Record<string, unknown>) => void;
  /** Remove the whole widget from the dashboard. */
  onRemove: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  // The chart on show, by position in the shown set.
  const [page, setPage] = useState(0);

  const vm = insightModule(widget, { areaName: areaAoi?.name });
  const showSummary = vm.summaryShown && vm.summaryText.length > 0;
  const allChartIds = vm.allCharts.map((c) => c.id);
  const total = vm.cards.length;
  // Hiding a chart can strand the pager past the end — clamp on the way out
  // rather than in an effect, so the card never paints an empty frame first.
  const index = Math.min(page, Math.max(total - 1, 0));
  const card = vm.cards[index] ?? null;
  const chartId = card?.id;

  const placeholder =
    vm.allCharts.length === 0
      ? "This analysis is not available."
      : total === 0 && !showSummary && isOwner
        ? "All content in this analysis is hidden — use Customize to show it."
        : null;

  return (
    <>
      <DashboardWidgetCard
        // The card is the analysis: its title is the chart on show, so paging
        // renames the header the way the workspace does.
        title={card?.title ?? vm.title}
        card={card}
        placeholder={placeholder}
        removeMode="widget"
        isOwner={isOwner}
        isDouble={isDouble}
        onArmDrag={onArmDrag}
        onToggleSize={onToggleSize}
        onRename={
          chartId
            ? (name) =>
                onUpdateConfig(withChartTitle(widget.config, chartId, name))
            : undefined
        }
        // Removal drops the whole widget, arrangement included, so it asks
        // with the module's own copy instead of the card's.
        onRequestRemove={() => setConfirmOpen(true)}
        onRemove={onRemove}
        headerActions={
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
        }
        intro={
          showSummary ? (
            <Flex direction="column" gap="8px" px="12px" pb="12px">
              {/* Same provenance rule as the chart card below, so the
                  narrative never contradicts it. */}
              <InsightCaption curated={vm.curated} />
              <Text fontSize="14px" lineHeight="20px" color="fg">
                {vm.summaryText}
              </Text>
            </Flex>
          ) : null
        }
        footer={
          total > 1 ? (
            <Flex
              align="center"
              justify="space-between"
              px="12px"
              py="8px"
              borderTopWidth="1px"
              borderColor="rgba(19,22,25,0.05)"
            >
              <IconButton
                aria-label="Previous chart"
                title="Previous chart"
                size="xs"
                variant="ghost"
                border="1px solid"
                borderColor="border.emphasized"
                disabled={index === 0}
                onClick={() => setPage(index - 1)}
              >
                <ArrowArcLeftIcon size={14} />
              </IconButton>
              <Text
                fontSize="12px"
                color="fg.muted"
                aria-live="polite"
                css={{ fontVariantNumeric: "tabular-nums" }}
              >
                {index + 1} of {total} charts
              </Text>
              <IconButton
                aria-label="Next chart"
                title="Next chart"
                size="xs"
                variant="ghost"
                border="1px solid"
                borderColor="border.emphasized"
                disabled={index === total - 1}
                onClick={() => setPage(index + 1)}
              >
                <ArrowArcRightIcon size={14} />
              </IconButton>
            </Flex>
          ) : null
        }
      />

      <RemoveAnalysisDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        customized={hasWidgetCustomization(widget.config)}
        onConfirm={onRemove}
      />
    </>
  );
}
