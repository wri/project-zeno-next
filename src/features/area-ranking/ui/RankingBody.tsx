import { useMemo } from "react";
import { Box, Button, Flex, Text } from "@chakra-ui/react";

import type { InsightWidget } from "@/app/types/chat";
import getChartColors from "@/app/utils/ChartColors";
import { resolveSeriesColor } from "@/app/utils/formatCharts";
import { widgetViewKey } from "@/src/shared/lib/widget-view-key";

import { parseRanking } from "../model/ranking";
import { noValueText, pageShare, topNoteText } from "../model/ranking-text";
import { PAGE_SIZE, rankingView } from "../model/ranking-view";
import useRankingViewStore from "../model/ranking-view-store";
import { RankingBars } from "./RankingBars";

function Note({ children }: { children: string }) {
  return (
    <Text fontSize="12px" lineHeight="16px" color="fg.muted">
      {children}
    </Text>
  );
}

/**
 * The curated ranking of areas by one value (`ranked-bar`): rank, name and a
 * bar for each area with a value, ten to a page on one scale. Swapped in by
 * `WidgetMessage` for the `ranked-bar` type in place of the generic
 * `ChartWidget`.
 *
 * `print` (the dashboard export) draws the first ten bars, no pager and no
 * tooltips; a ranking cut short says so, and the areas with no value are named
 * only when every bar fits. A chart the parser cannot read throws, for the
 * widget's error boundary.
 */
export function RankingBody({
  widget,
  print = false,
}: {
  widget: InsightWidget;
  print?: boolean;
}) {
  const ranking = useMemo(
    () => parseRanking(widget.data, widget.yAxis),
    [widget.data, widget.yAxis]
  );
  const widgetKey = widgetViewKey(widget);
  const storedPage = useRankingViewStore((s) => s.pageByWidget[widgetKey]) ?? 0;
  const setPage = useRankingViewStore((s) => s.setPage);
  const view = rankingView(ranking, print ? 0 : storedPage);

  // The same rule as the one-area chart: the chart's own color, else the
  // dataset's, else the first of the default chart colors.
  const color =
    resolveSeriesColor(widget.seriesColor, widget.datasetName) ??
    getChartColors()[0];
  const share = print ? undefined : pageShare(ranking, view);
  const showNoValue =
    ranking.noValue.length > 0 &&
    (print ? view.pageCount === 1 : !view.hasNext);

  return (
    // The container the name column's width is measured against.
    <Flex
      direction="column"
      gap="8px"
      w="full"
      css={{ containerType: "inline-size" }}
    >
      {share && (
        // 8px under the flex gap, so the space above the first bar is the 16px
        // the pager text has below the last: its gap plus the 8px the text
        // sits inside its 32px button row.
        <Flex direction="column" gap="4px" mb="8px">
          <Text fontSize="12px" lineHeight="16px">
            <Text as="span" fontWeight="bold">
              {share.lead}
            </Text>{" "}
            <Text as="span" color="fg.muted">
              {share.tail}
            </Text>
          </Text>
          <Flex
            aria-hidden="true"
            h="6px"
            borderRadius="3px"
            overflow="hidden"
            bg="gray.200"
          >
            <Box
              w={`${share.beforePct}%`}
              bg={`color-mix(in srgb, ${color} 45%, white)`}
            />
            <Box w={`${share.pagePct}%`} bg={color} />
          </Flex>
        </Flex>
      )}

      <RankingBars
        rows={view.rows}
        ranking={ranking}
        color={color}
        print={print}
      />

      {!print && view.pageCount > 1 && (
        // The table's pager, copied: extracting one is a follow-up.
        <Flex align="center" justify="space-between" gap="8px">
          <Text fontSize="xs" color="fg.muted" aria-live="polite">
            Showing {view.start}–{view.end} of {ranking.bars.length}
          </Text>
          {/* Left out of a downloaded image (see exportChartImage). */}
          <Flex gap={1} data-export-exclude="">
            <Button
              size="xs"
              variant="ghost"
              onClick={() => setPage(widgetKey, view.page - 1)}
              disabled={!view.hasPrevious}
              aria-label="Previous areas"
            >
              Previous
            </Button>
            <Button
              size="xs"
              variant="ghost"
              onClick={() => setPage(widgetKey, view.page + 1)}
              disabled={!view.hasNext}
              aria-label="Next areas"
            >
              Next
            </Button>
          </Flex>
        </Flex>
      )}

      {showNoValue && <Note>{noValueText(ranking, ranking.noValue)}</Note>}
      {print && ranking.bars.length > PAGE_SIZE && (
        <Note>{topNoteText(PAGE_SIZE, ranking.areas.length)}</Note>
      )}
    </Flex>
  );
}
