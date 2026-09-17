"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Box, Button, Flex, IconButton, Text } from "@chakra-ui/react";
import {
  ArrowArcLeftIcon,
  ArrowArcRightIcon,
  CaretLeftIcon,
} from "@phosphor-icons/react";

import { CATALOG_CARD_WIDTH_PX } from "@/app/explorationLayout";
import InsightCaption from "@/app/components/InsightCaption";
import InsightChartPills from "@/app/components/InsightChartPills";
import WidgetMessage from "@/app/components/WidgetMessage";
import {
  collapseNetFluxRollups,
  netFluxRollups,
  useNetFluxDetail,
} from "@/src/features/net-flux";
import { Tooltip } from "@/app/components/ui/tooltip";
import { WidgetIconComponent } from "@/app/utils/widgetIcons";
import type { InsightVerification } from "@/src/entities/insight";
import type { InsightWidget } from "@/app/types/chat";

import type { InsightGroupItem } from "../lib/insight-groups";

/**
 * Building blocks shared by the Analyses pane's card lists (stored insights,
 * live widgets, curated analyses): the card thumbnail and badge, and the
 * detail view that pages through charts. Kept out of `insights-panel.tsx` so
 * each list can compose them without importing the panel itself.
 */

export const INSIGHT_LABEL_COLOR = "#0049AA";
export const INSIGHT_SELECTED_BG = "rgba(0, 73, 170, 0.06)";

export function InsightThumbnail({ type }: { type: InsightWidget["type"] }) {
  const Icon = WidgetIconComponent[type];
  return (
    <Flex w="100%" h="100%" align="center" justify="center" bg="primary.25">
      <Icon size={28} color={INSIGHT_LABEL_COLOR} weight="thin" />
    </Flex>
  );
}

export function VerificationBadge({
  verification,
}: {
  verification: InsightVerification;
}) {
  // Panel-card badges reuse the workspace insight caption's styling (icon +
  // label) minus its "Learn more" link, so curated and AI-assisted analyses
  // read identically on the card and in the workspace.
  return (
    <InsightCaption
      curated={verification === "verified"}
      showLearnMore={false}
    />
  );
}

/**
 * Detail view for one analysis: pages through its own charts.
 *
 * An LGMS analysis arrives as four charts, three of which are the same time
 * series at different roll-ups. They fold into one entry chosen by the DETAIL
 * pill, so the pane pages through two charts and not four — the same reading
 * the map workspace gives. The pane's charts carry backend UUIDs rather than
 * the `{insightId}-chart-{n}` ids, so the roll-ups are found within this one
 * analysis and keyed on its id (see `netFluxRollups`).
 */
export function InsightGroupDetail({
  group,
  onBack,
}: {
  group: InsightGroupItem;
  onBack: () => void;
}) {
  const [chartIndex, setChartIndex] = useState(0);
  const rollups = useMemo(() => netFluxRollups(group.widgets), [group.widgets]);
  const { selected } = useNetFluxDetail(group.id, rollups);
  const widgets = useMemo(
    () => collapseNetFluxRollups(group.widgets, selected?.id),
    [group.widgets, selected?.id]
  );
  // Switching DETAIL can shorten nothing here (the fold is 1-for-1), but a
  // group that reloads with fewer charts would strand the pager past the end.
  const index = Math.min(chartIndex, Math.max(widgets.length - 1, 0));
  const widget = widgets[index];

  return (
    <InsightDetail
      widgets={widgets}
      index={index}
      onIndexChange={setChartIndex}
      onBack={onBack}
      unit="chart"
      toolbar={
        widget ? (
          <InsightChartPills
            widget={widget}
            siblings={rollups}
            groupKey={group.id}
          />
        ) : null
      }
    />
  );
}

export function InsightDetail({
  widgets,
  index,
  onIndexChange,
  onBack,
  unit,
  toolbar,
}: {
  widgets: InsightWidget[];
  index: number;
  onIndexChange: (index: number) => void;
  onBack: () => void;
  /** What prev/next steps through: sibling analyses, or one analysis's charts. */
  unit: "analysis" | "chart";
  /**
   * Per-chart controls for the chart on show, rendered above the card the way
   * the workspace shell does (`InsightChartPills`). The pane is the shell
   * here, so `WidgetMessage` is still mounted `inWorkspace`.
   */
  toolbar?: ReactNode;
}) {
  const widget = widgets[index];
  const total = widgets.length;
  const counter =
    unit === "analysis"
      ? `${index + 1} of ${total} available analyses`
      : `${index + 1} of ${total} charts in this analysis`;

  return (
    <Box w={`${CATALOG_CARD_WIDTH_PX}px`} maxW="100%" flexShrink={0}>
      <Button
        variant="ghost"
        size="xs"
        px={1}
        mb={2}
        color="#656E7B"
        onClick={onBack}
      >
        <CaretLeftIcon size={14} />
        Back to analyses
      </Button>

      {toolbar && <Box mb={2}>{toolbar}</Box>}

      <WidgetMessage widget={widget} inWorkspace />

      {total > 1 && (
        <Flex mt={3} justify="space-between" align="center">
          <Tooltip content={`Previous ${unit}`} openDelay={400}>
            <IconButton
              size="xs"
              variant="ghost"
              border="1px solid"
              borderColor="border.emphasized"
              aria-label={`Previous ${unit}`}
              disabled={index === 0}
              onClick={() => onIndexChange(index - 1)}
            >
              <ArrowArcLeftIcon size={14} />
            </IconButton>
          </Tooltip>
          <Text
            fontSize="xs"
            color="neutral.500"
            aria-live="polite"
            css={{ fontVariantNumeric: "tabular-nums" }}
          >
            {counter}
          </Text>
          <Tooltip content={`Next ${unit}`} openDelay={400}>
            <IconButton
              size="xs"
              variant="ghost"
              border="1px solid"
              borderColor="border.emphasized"
              aria-label={`Next ${unit}`}
              disabled={index === total - 1}
              onClick={() => onIndexChange(index + 1)}
            >
              <ArrowArcRightIcon size={14} />
            </IconButton>
          </Tooltip>
        </Flex>
      )}
    </Box>
  );
}
