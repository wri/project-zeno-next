"use client";
import { Box, Flex, Text } from "@chakra-ui/react";

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

function MeasureInfo() {
  return (
    <Box>
      <Text fontWeight="bold" mb="4px">
        Measure
      </Text>
      <Text mb="8px">
        <Text as="span" fontWeight="bold">
          Gross:
        </Text>{" "}
        Gross emissions and removals with net flux depicted as a line.
      </Text>
      <Text>
        <Text as="span" fontWeight="bold">
          Net:
        </Text>{" "}
        Only net fluxes. For categories with only emissions, gross and net
        values are the same.
      </Text>
    </Box>
  );
}

function DetailInfo() {
  return (
    <Box>
      <Text fontWeight="bold" mb="4px">
        Detail
      </Text>
      <Text mb="8px">
        <Text as="span" fontWeight="bold">
          Full:
        </Text>{" "}
        Vegetation and soil fluxes are separated into components. Cropland
        management and livestock are separate.
      </Text>
      <Text mb="8px">
        <Text as="span" fontWeight="bold">
          Categories:
        </Text>{" "}
        Vegetation and soil are separate. Cropland management and livestock are
        separate.
      </Text>
      <Text>
        <Text as="span" fontWeight="bold">
          Summary:
        </Text>{" "}
        Vegetation and soil are combined into land use. Cropland management and
        livestock are combined into agriculture.
      </Text>
    </Box>
  );
}

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
            info={<DetailInfo />}
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
          info={<MeasureInfo />}
        />
      </Flex>
    </Flex>
  );
}
