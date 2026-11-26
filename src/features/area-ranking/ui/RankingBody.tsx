import { useMemo } from "react";
import { Button, Flex, Text } from "@chakra-ui/react";

import type { InsightWidget } from "@/app/types/chat";
import getChartColors from "@/app/utils/ChartColors";
import { widgetViewKey } from "@/src/shared/lib/widget-view-key";

import { parseRanking } from "../model/ranking";
import { noValueText, topNoteText } from "../model/ranking-text";
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

  // The chart's own color, else the first of the default chart colors.
  const color = widget.seriesColor ?? getChartColors()[0];
  const showNoValue =
    view.noValue.length > 0 && (print ? view.pageCount === 1 : !view.hasNext);

  return (
    // The container the name column's width is measured against.
    <Flex
      direction="column"
      gap="8px"
      w="full"
      css={{ containerType: "inline-size" }}
    >
      <RankingBars
        rows={view.rows}
        ranking={ranking}
        scaleMax={view.scaleMax}
        color={color}
        print={print}
      />

      {!print && view.pageCount > 1 && (
        // The table's pager, copied: extracting one is a follow-up.
        <Flex align="center" justify="space-between" gap="8px">
          <Text fontSize="xs" color="fg.muted" aria-live="polite">
            Showing {view.start}–{view.end} of {view.total}
          </Text>
          <Flex gap={1}>
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

      {showNoValue && <Note>{noValueText(ranking, view.noValue)}</Note>}
      {print && view.total > PAGE_SIZE && (
        <Note>{topNoteText(PAGE_SIZE, ranking.areas.length)}</Note>
      )}
    </Flex>
  );
}
