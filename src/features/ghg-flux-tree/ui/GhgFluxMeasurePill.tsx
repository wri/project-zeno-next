"use client";
import { Box, Flex } from "@chakra-ui/react";

import type { InsightWidget } from "@/app/types/chat";
import { Pill } from "@/src/shared/ui/Pill";

import { parseFluxNodes, type FluxMeasure } from "../model/hierarchy";
import { treeViewKey } from "../model/tree-view-store";
import { useTreeView } from "./use-tree-view";

const MEASURE_LABEL: Record<FluxMeasure, string> = {
  net: "Net",
  gross: "Gross",
};
const MEASURE_OPTIONS: FluxMeasure[] = ["net", "gross"];

/**
 * The design's MEASURE dropdown pill. Unlike the time-series insight there is
 * no DETAIL pill here — detail is driven by the tree's own disclosure carets,
 * so the "summary" / "categories" / "full view" frames are expansion states
 * rather than a separate control.
 *
 * Rendered on the workspace shell above the widget card, so it reads from the
 * shared view store rather than taking the selection as a prop.
 */
export function GhgFluxMeasurePill({
  widget,
  showDivider = true,
}: {
  widget: InsightWidget;
  showDivider?: boolean;
}) {
  const nodes = parseFluxNodes(widget.data);
  const { measure, setMeasure } = useTreeView(treeViewKey(widget), nodes);

  return (
    <Flex direction="column" gap="8px">
      {showDivider && <Box borderTop="1px solid" borderColor="#DDE2F5" />}
      <Flex>
        <Pill
          label="MEASURE"
          value={MEASURE_LABEL[measure]}
          options={MEASURE_OPTIONS.map((value) => ({
            value,
            label: MEASURE_LABEL[value],
          }))}
          onSelect={(value) => setMeasure(value as FluxMeasure)}
        />
      </Flex>
    </Flex>
  );
}
