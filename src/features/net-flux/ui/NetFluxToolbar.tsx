import { Box, Flex } from "@chakra-ui/react";

import useInsightStore from "@/app/store/insightStore";
import type { InsightWidget } from "@/app/types/chat";
import { InfoDefinition, InfoTitle } from "@/src/shared/ui/InfoTooltip";
import { MeasureInfo } from "@/src/shared/ui/MeasureInfo";
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

function DetailInfo() {
  return (
    <Box>
      <InfoTitle>Detail</InfoTitle>
      <InfoDefinition term="Summary (low detail)">
        Vegetation and soil are combined into land use. Cropland management and
        livestock are combined into agriculture.
      </InfoDefinition>
      <InfoDefinition term="Categories (medium detail)">
        Vegetation and soil are separate. Cropland management and livestock are
        separate.
      </InfoDefinition>
      <InfoDefinition term="Full (high detail)">
        Vegetation and soil fluxes are separated into components. Cropland
        management and livestock are separate.
      </InfoDefinition>
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
 *
 * By default the siblings are found in the map workspace's insight store by
 * `chartBatchKey`. Surfaces that render an analysis from somewhere else (the
 * dashboard module, the Analyses pane) hold its charts directly and their ids
 * do not carry that shape, so they pass `siblings` and the `groupKey` the
 * DETAIL choice is remembered under — see `netFluxRollups`.
 */
export function NetFluxToolbar({
  widget,
  siblings: siblingsProp,
  groupKey: groupKeyProp,
  showDivider = true,
}: {
  widget: InsightWidget;
  /** The roll-ups to choose between, default detail first. */
  siblings?: InsightWidget[];
  /** Key the DETAIL choice is stored under; required alongside `siblings`. */
  groupKey?: string;
  showDivider?: boolean;
}) {
  const insights = useInsightStore((s) => s.insights);
  const siblings = siblingsProp ?? netFluxSiblings(insights, widget);
  const groupKey = groupKeyProp ?? netFluxGroupKey(widget);
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
