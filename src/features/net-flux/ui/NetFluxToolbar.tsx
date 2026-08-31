"use client";
import { Box, Flex } from "@chakra-ui/react";

import useInsightStore from "@/app/store/insightStore";
import type { InsightWidget } from "@/app/types/chat";
import { Pill } from "@/src/shared/ui/Pill";

import { useNetFluxDetail, useNetFluxView } from "./use-net-flux-view";
import {
  netFluxGroupKey,
  netFluxSiblings,
  netFluxWidgetDetailPillLabel,
} from "../model/net-flux-siblings";
import { netFluxViewKey } from "../model/net-flux-view-store";
import { type NetFluxMeasure } from "../model/net-flux-variants";

const MEASURE_LABEL: Record<NetFluxMeasure, string> = {
  gross: "Gross",
  net: "Net",
};
const MEASURE_OPTIONS: NetFluxMeasure[] = ["gross", "net"];

/**
 * DETAIL / MEASURE controls for the net-flux insight. In the workspace these
 * sit above the widget card on the shell background, per the design's "Widget
 * toolbar (reusable)" frame; elsewhere (dashboards, /chart-debug)
 * `WidgetMessage` renders them inline at the top of the card instead.
 *
 * DETAIL selects between the three roll-ups `LGMSChartGenerator` returns
 * (Full detail / Category / Summary) rather than re-slicing one payload. It is
 * hidden when the widget has no siblings — a single chart, or one rehydrated
 * without the id shape the grouping relies on.
 */
export function NetFluxToolbar({
  widget,
  showDivider = true,
}: {
  widget: InsightWidget;
  showDivider?: boolean;
}) {
  const insights = useInsightStore((s) => s.insights);
  const siblings = netFluxSiblings(insights, widget);
  const groupKey = netFluxGroupKey(widget);
  const { selected, select } = useNetFluxDetail(groupKey, siblings);
  const { measure, setMeasure } = useNetFluxView(netFluxViewKey(widget));

  return (
    <Flex direction="column" gap="8px">
      {showDivider && <Box borderTop="1px solid" borderColor="#DDE2F5" />}
      <Flex gap="8px" wrap="wrap">
        {siblings.length > 1 && (
          <Pill
            label="DETAIL"
            value={netFluxWidgetDetailPillLabel(selected ?? widget)}
            options={siblings.map((w) => ({
              value: w.id ?? w.title,
              label: netFluxWidgetDetailPillLabel(w),
            }))}
            onSelect={select}
            minW="160px"
          />
        )}
        <Pill
          label="MEASURE"
          value={MEASURE_LABEL[measure]}
          options={MEASURE_OPTIONS.map((value) => ({
            value,
            label: MEASURE_LABEL[value],
          }))}
          onSelect={(value) => setMeasure(value as NetFluxMeasure)}
          minW="160px"
        />
      </Flex>
    </Flex>
  );
}
