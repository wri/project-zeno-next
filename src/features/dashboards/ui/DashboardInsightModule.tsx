"use client";

import { useState } from "react";
import { Box, Flex, Text } from "@chakra-ui/react";

import InsightCaption from "@/app/components/InsightCaption";
import InsightChartPills, {
  hasChartPills,
} from "@/app/components/InsightChartPills";
import {
  collapseNetFluxRollups,
  netFluxRollups,
  useNetFluxDetail,
} from "@/src/features/net-flux";
import type { InsightWidget } from "@/app/types/chat";
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
 * One insight rendered on the dashboard as a SET of cards — one light-blue
 * `DashboardWidgetCard` per chart, laid out side by side inside the widget's
 * own grid cell and wrapping when they don't fit. An analysis that returns two
 * charts (tree cover loss and the GHG emissions it caused; LGMS's tree and its
 * time series) therefore shows both at once, the way a pair reads as one
 * finding rather than as a chart with something hidden behind an arrow. The
 * charts previously paged through a single shell behind a "1 of N charts"
 * footer, which buried the second half of every pair.
 *
 * The set is still ONE widget: one grid item, one position, one drag. So the
 * widget-level chrome lives on the first card only — the narrative, the
 * Customize menu, and the X that deletes the whole analysis. Every later
 * card's X hides just that chart (`removeMode="chart"`), recoverable from
 * Customize. Each card carries its own title, rename and per-chart pills.
 *
 * An LGMS analysis deals two cards from four charts: its three time-series
 * roll-ups fold into the one the DETAIL pill selects. The Customize menu still
 * lists all four — which charts a widget holds stays the owner's business.
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

  const vm = insightModule(widget, { areaName: areaAoi?.name });
  const showSummary = vm.summaryShown && vm.summaryText.length > 0;
  const allChartIds = vm.allCharts.map((c) => c.id);
  // The widget's charts are one analysis by construction, and they carry
  // backend UUIDs rather than the `{insightId}-chart-{n}` ids the workspace
  // groups by — so the roll-ups are found within this module and keyed on the
  // widget (see `netFluxRollups`).
  // Not memoized: `insightModule` rebuilds `vm.cards` every render anyway, so
  // a useMemo keyed on it could never hit — and the React Compiler rejects the
  // mismatch between the dependency it infers (`vm`) and the one written.
  const rollups = netFluxRollups(vm.cards);
  const { selected } = useNetFluxDetail(widget.id, rollups);
  const cards = collapseNetFluxRollups(vm.cards, selected?.id);

  const placeholder =
    vm.allCharts.length === 0
      ? "This analysis is not available."
      : cards.length === 0 && !showSummary && isOwner
        ? "All content in this analysis is hidden — use Customize to show it."
        : null;

  // With nothing to show there is still one card: the shell that carries the
  // placeholder, the narrative and the owner's way back via Customize.
  const entries: (InsightWidget | null)[] = cards.length > 0 ? cards : [null];
  // Side by side inside one cell means each card is only half as wide as the
  // widget, whatever the widget's own span.
  const single = entries.length === 1;

  return (
    <>
      <Flex wrap="wrap" gap="12px" align="stretch">
        {entries.map((card, i) => {
          const chartId = card?.id;
          const lead = i === 0;
          return (
            <Box
              // Keyed on the chart so a card remounts when the chart under it
              // changes (the DETAIL pill swapping one roll-up for another):
              // the card holds its own rename draft and full-screen state,
              // and an in-flight rename would otherwise show — and never
              // reconcile — against the new chart.
              key={chartId ?? "no-chart"}
              // A basis rather than an equal share, so two cards sit side by
              // side when there is room and stack once the column is narrow.
              flex="1 1 320px"
              minW={0}
            >
              <DashboardWidgetCard
                title={card?.title ?? vm.title}
                card={card}
                placeholder={lead ? placeholder : null}
                // The lead card owns the analysis: its X removes the whole
                // widget. A later card's X only hides its own chart.
                removeMode={lead ? "widget" : "chart"}
                isOwner={isOwner}
                isDouble={isDouble}
                bodyFullWidth={isDouble && single}
                showWidgetControls={lead}
                onArmDrag={onArmDrag}
                onToggleSize={onToggleSize}
                onRename={
                  chartId
                    ? (name) =>
                        onUpdateConfig(
                          withChartTitle(widget.config, chartId, name)
                        )
                    : undefined
                }
                // Removing the analysis discards the whole arrangement, so the
                // lead card asks with the module's own copy instead of the
                // card's. Hiding one chart is recoverable and does not ask.
                onRequestRemove={lead ? () => setConfirmOpen(true) : undefined}
                onRemove={
                  lead
                    ? onRemove
                    : () =>
                        chartId &&
                        onUpdateConfig(
                          withChartHidden(widget.config, chartId, allChartIds)
                        )
                }
                headerActions={
                  lead ? (
                    <DashboardModuleCustomizeMenu
                      summaryAvailable={vm.summaryText.length > 0}
                      summaryShown={vm.summaryShown}
                      charts={vm.allCharts}
                      onToggleSummary={(shown) =>
                        onUpdateConfig(withSummaryShown(widget.config, shown))
                      }
                      onToggleChart={(id, shown) =>
                        onUpdateConfig(
                          shown
                            ? withChartShown(widget.config, id, allChartIds)
                            : withChartHidden(widget.config, id, allChartIds)
                        )
                      }
                    />
                  ) : undefined
                }
                intro={
                  (lead && showSummary) || (card && hasChartPills(card)) ? (
                    <Flex direction="column" gap="8px" px="12px" pb="12px">
                      {lead && showSummary && (
                        <>
                          {/* Same provenance rule as the chart card below, so
                              the narrative never contradicts it. */}
                          <InsightCaption curated={vm.curated} />
                          <Text fontSize="14px" lineHeight="20px" color="fg">
                            {vm.summaryText}
                          </Text>
                        </>
                      )}
                      {/* The design puts these above the card, and the shell
                          that hosts it is this module (DashboardWidgetCard
                          mounts WidgetMessage `inWorkspace`, which suppresses
                          them inline). */}
                      {card && (
                        <InsightChartPills
                          widget={card}
                          siblings={rollups}
                          groupKey={widget.id}
                        />
                      )}
                    </Flex>
                  ) : null
                }
              />
            </Box>
          );
        })}
      </Flex>

      <RemoveAnalysisDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        customized={hasWidgetCustomization(widget.config)}
        onConfirm={onRemove}
      />
    </>
  );
}
