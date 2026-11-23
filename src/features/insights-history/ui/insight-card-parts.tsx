import { Fragment, useMemo, useState, type ReactNode } from "react";
import { Box, Button, Flex, IconButton, Text } from "@chakra-ui/react";
import {
  ArrowArcLeftIcon,
  ArrowArcRightIcon,
  CaretLeftIcon,
} from "@phosphor-icons/react";
import { format } from "date-fns";

import { CATALOG_CARD_WIDTH_PX } from "@/app/explorationLayout";
import InsightCaption from "@/app/components/InsightCaption";
import InsightChartPills from "@/app/components/InsightChartPills";
import WidgetMessage from "@/app/components/WidgetMessage";
import { INPUTS_NOT_RECORDED } from "@/app/components/widgets/AnalysisParameters";
import { yearParam } from "@/app/utils/formatYearRange";
import {
  collapseNetFluxRollups,
  netFluxRollups,
  useNetFluxDetail,
} from "@/src/features/net-flux";
import { Tooltip } from "@/app/components/ui/tooltip";
import { WidgetIconComponent } from "@/app/utils/widgetIcons";
import type {
  AnalysisInputs,
  InsightVerification,
} from "@/src/entities/insight";
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

/** "13 Oct 2026" for an ISO timestamp; "" when there is none. */
export function formatGeneratedAt(createdAt: string): string {
  if (!createdAt) return "";
  const date = new Date(createdAt);
  return Number.isNaN(date.getTime()) ? "" : format(date, "d MMM yyyy");
}

/** Areas the panel names before the rest collapse into "and N more". */
const PANEL_AREA_LIMIT = 5;

/**
 * The detail view's "What was analyzed" panel: the inputs the backend
 * recorded for this analysis, and when it ran. Read-only: the map is not
 * moved and nothing re-runs from here.
 */
export function AnalyzedInputsPanel({
  inputs,
  createdAt,
}: {
  inputs: AnalysisInputs;
  /** The stored insight's timestamp; "" when unknown (the Run row is left out). */
  createdAt: string;
}) {
  const run = formatGeneratedAt(createdAt);
  const rows: [term: string, values: string[]][] = [];
  if (inputs.recorded) {
    const names = inputs.areas.map((area) => area.name);
    const more = names.length - PANEL_AREA_LIMIT;
    rows.push(
      [
        "Area",
        [
          ...names.slice(0, PANEL_AREA_LIMIT),
          ...(more > 0 ? [`and ${more} more`] : []),
        ],
      ],
      ["Dataset", inputs.datasets.map((dataset) => dataset.name)],
      ["Canopy density", inputs.canopyCover.map((v) => `More than ${v}%`)],
      [
        "Years",
        inputs.years.map((years) => yearParam(years.start, years.end).value),
      ]
    );
  }
  if (run) rows.push(["Run", [run]]);
  const shown = rows.filter(([, values]) => values.length > 0);

  return (
    <Box
      as="section"
      aria-label="What was analyzed"
      bg="primary.25"
      borderWidth="1px"
      borderColor="#DDE2F5"
      borderRadius="6px"
      px="14px"
      py="12px"
      fontSize="12px"
      lineHeight="16px"
      color="neutral.700"
    >
      <Text
        fontFamily="mono"
        fontSize="10px"
        letterSpacing="0.03em"
        color="neutral.500"
        mb="8px"
      >
        WHAT WAS ANALYZED
      </Text>
      {!inputs.recorded && (
        <Text mb={shown.length > 0 ? "8px" : 0}>{INPUTS_NOT_RECORDED}</Text>
      )}
      {shown.length > 0 && (
        <Box
          as="dl"
          display="grid"
          gridTemplateColumns="96px minmax(0, 1fr)"
          columnGap="8px"
          rowGap="4px"
          m={0}
        >
          {shown.map(([term, values]) => (
            <Fragment key={term}>
              <Box as="dt" color="neutral.500">
                {term}
              </Box>
              <Box as="dd" m={0} minW={0} overflowWrap="anywhere">
                {values.map((value, i) => (
                  <Text key={i}>{value}</Text>
                ))}
              </Box>
            </Fragment>
          ))}
        </Box>
      )}
    </Box>
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
 * the map workspace gives. The pane already holds this one analysis's charts,
 * so the roll-ups are found among them and keyed on its id (see
 * `netFluxRollups`).
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
      createdAt={group.createdAt}
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
  createdAt,
  toolbar,
}: {
  widgets: InsightWidget[];
  index: number;
  onIndexChange: (index: number) => void;
  onBack: () => void;
  /** What prev/next steps through: sibling analyses, or one analysis's charts. */
  unit: "analysis" | "chart";
  /** When the analysis on show was stored; "" when unknown. */
  createdAt: string;
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

      {widget.analysisInputs && (
        <Box mt={3}>
          <AnalyzedInputsPanel
            inputs={widget.analysisInputs}
            createdAt={createdAt}
          />
        </Box>
      )}

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
