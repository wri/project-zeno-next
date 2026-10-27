import { Box, Flex, Text } from "@chakra-ui/react";

import { AnalysisParamsChips } from "@/app/components/widgets/AnalysisParameters";
import { buildChips } from "@/app/components/widgets/analysis-params-utils";
import type { InsightWidget } from "@/app/types/chat";
import type { MapAreaAoi, MapWidgetLayer } from "../lib/mapWidgets";
import type { NoteSource } from "../lib/widgets";
import DashboardTextWidget from "./DashboardTextWidget";
import DashboardWidgetBody from "./DashboardWidgetBody";
import { WIDGET_TITLE_PROPS } from "./DashboardWidgetCard";
import NoteCaption from "./NoteCaption";

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
  card?: InsightWidget;
  map?: MapWidgetLayer;
  aoi?: MapAreaAoi;
  viewportBbox?: [number, number, number, number];
  placeholder?: string;
  isDouble: boolean;
  /** Rendered above the body — the analysis narrative and chart pills. */
  intro?: React.ReactNode;
}) {
  const chips = card?.analysisParams ? buildChips(card.analysisParams) : [];

  return (
    <Flex flexDir="column" css={UNBROKEN}>
      <Text pb="8px" {...WIDGET_TITLE_PROPS}>
        {title}
      </Text>
      {chips.length > 0 && (
        <Box pb="8px">
          {/* Full values: paper has no tooltip to reveal a truncated one. */}
          <AnalysisParamsChips chips={chips} maxValueWidth="none" />
        </Box>
      )}
      {intro}
      <DashboardWidgetBody
        card={card}
        map={map}
        aoi={aoi}
        viewportBbox={viewportBbox}
        placeholder={placeholder}
        isDouble={isDouble}
        print
      />
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
  source,
  placeholder,
}: {
  text: string | null;
  /** Who wrote the note, which picks its caption. */
  source: NoteSource;
  /** Copy shown when the note is empty; the grid sets it whenever `text` is null. */
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
        <NoteCaption source={source} />
      </Flex>
      {text ? (
        <DashboardTextWidget text={text} print />
      ) : (
        <Text py="12px" fontSize="sm" color="fg.muted">
          {placeholder}
        </Text>
      )}
    </Box>
  );
}
