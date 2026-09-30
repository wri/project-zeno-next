"use client";

import { Box, Flex, Text } from "@chakra-ui/react";
import { ChartBarIcon } from "@phosphor-icons/react";

import InsightCaption from "@/app/components/InsightCaption";
import WidgetMessage from "@/app/components/WidgetMessage";
import { AnalysisParamsChips } from "@/app/components/widgets/AnalysisParameters";
import { buildChips } from "@/app/components/widgets/analysis-params-utils";
import type { InsightWidget } from "@/app/types/chat";
import type { MapWidgetLayer } from "../lib/mapWidgets";
import DashboardMapWidget from "./DashboardMapWidget";
import DashboardTextWidget from "./DashboardTextWidget";

// A widget is never split across pages. A card taller than a page still is:
// the browser treats this as a preference.
const UNBROKEN = { breakInside: "avoid" };

/**
 * An analysis chart or map widget as the export prints it — the read-only
 * counterpart of `DashboardWidgetCard`. No shell (fill, edge, inset) and no
 * controls, so the widget reads as part of the section it sits in; its params
 * show outright, since paper has no "Show params" to click.
 */
export default function DashboardWidgetDocument({
  title,
  card,
  map,
  aoi,
  viewportBbox,
  placeholder,
  isDouble,
  intro,
}: {
  title: string;
  card: InsightWidget | null;
  map?: MapWidgetLayer | null;
  aoi?: { source: string; src_id: string; name: string };
  viewportBbox?: [number, number, number, number] | null;
  placeholder: string | null;
  isDouble: boolean;
  /** Rendered above the body — the analysis narrative and chart pills. */
  intro?: React.ReactNode;
}) {
  const chips = card?.analysisParams ? buildChips(card.analysisParams) : [];

  return (
    <Flex flexDir="column" css={UNBROKEN}>
      <Text
        pb="8px"
        fontSize="14px"
        fontWeight="medium"
        lineHeight="16px"
        color="#172B7A"
        wordBreak="break-word"
      >
        {title}
      </Text>
      {chips.length > 0 && (
        <Box pb="8px">
          {/* Full values: paper has no tooltip to reveal a truncated one. */}
          <AnalysisParamsChips chips={chips} maxValueWidth="none" />
        </Box>
      )}
      {intro}
      {placeholder ? (
        <Flex
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
        <DashboardMapWidget
          layer={map}
          aoi={aoi}
          bboxOverride={viewportBbox ?? null}
          tall={isDouble}
          print
        />
      ) : (
        card && (
          <WidgetMessage widget={card} inWorkspace fullWidth={isDouble} print />
        )
      )}
    </Flex>
  );
}

/**
 * A note as the export prints it — the read-only counterpart of
 * `DashboardTextWidgetCard`: the provenance caption over the whole note, with
 * no edge, height cap or internal scroll.
 */
export function DashboardNoteDocument({
  text,
  placeholder,
}: {
  text: string | null;
  placeholder: string | null;
}) {
  return (
    <Box css={UNBROKEN}>
      <Flex
        align="center"
        minH="36px"
        py="8px"
        borderBottomWidth="1px"
        borderColor="#E0E2E5"
      >
        <InsightCaption />
      </Flex>
      {text ? (
        <DashboardTextWidget text={text} print />
      ) : (
        <Text py="12px" fontSize="sm" color="fg.muted">
          {placeholder ?? "This note is empty."}
        </Text>
      )}
    </Box>
  );
}
