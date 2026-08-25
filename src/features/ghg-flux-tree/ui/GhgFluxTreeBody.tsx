"use client";
import { Box, Flex, Text } from "@chakra-ui/react";

import type { InsightWidget } from "@/app/types/chat";

import {
  nodeNet,
  parseFluxNodes,
  reconciliationIssues,
  rootNodes,
  type FluxMeasure,
} from "../model/hierarchy";
import { treeViewKey } from "../model/tree-view-store";
import { GhgFluxTreeChart } from "./GhgFluxTreeChart";
import {
  EMISSIONS_COLOR,
  LEGEND_BG,
  NET_TICK_COLOR,
  REMOVALS_COLOR,
} from "./tree-chart-constants";
import { useTreeView } from "./use-tree-view";

const signed = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
  signDisplay: "always",
});

function LegendSwatch({ color }: { color: string }) {
  return <Box w="12px" h="12px" rounded="2px" bg={color} flexShrink={0} />;
}

function LegendEntry({ color, label }: { color: string; label: string }) {
  return (
    <Flex align="center" gap="6px">
      <LegendSwatch color={color} />
      <Text fontFamily="body" fontSize="11px" color="#3A4048">
        {label}
      </Text>
    </Flex>
  );
}

/** Emissions/removals key, plus the net marker when the gross view shows one. */
function TreeLegend({ measure }: { measure: FluxMeasure }) {
  return (
    <Flex bg={LEGEND_BG} rounded="4px" p="10px" gap="20px" wrap="wrap" w="full">
      <LegendEntry color={REMOVALS_COLOR} label="Sink/gross removals (−)" />
      <LegendEntry color={EMISSIONS_COLOR} label="Source/gross emissions (+)" />
      {measure === "gross" && (
        <Flex align="center" gap="6px">
          <Box w="3px" h="12px" bg={NET_TICK_COLOR} flexShrink={0} />
          <Text fontFamily="body" fontSize="11px" color="#3A4048">
            Net
          </Text>
        </Flex>
      )}
    </Flex>
  );
}

/**
 * Curated "Net GHG flux (annual average)" body: the headline figure, the
 * hierarchical plot, and the legend. Swapped in by `WidgetMessage` for this
 * chart type in place of the generic `ChartWidget`, whose axis handling assumes
 * vertical bars and a fixed height.
 */
export function GhgFluxTreeBody({ widget }: { widget: InsightWidget }) {
  const nodes = parseFluxNodes(widget.data);
  const { measure, rows, toggleNode, fullyExpanded } = useTreeView(
    treeViewKey(widget),
    nodes
  );
  // PoC (PZB-1185): the tree combines a ~30 m annual-average source (land
  // use) with a ~10 km single-year source (agriculture) — flag it when the
  // levels it was given don't actually sum, rather than silently trusting
  // whatever a resampled/aggregated rollup reports. See reconciliationIssues.
  const issues = reconciliationIssues(nodes);

  const root = rootNodes(nodes)[0];
  const rootNet = root ? nodeNet(root) : null;
  // Positive net flux means the land is a net source; negative means it absorbs
  // more than it emits.
  const direction = (rootNet ?? 0) < 0 ? "Net Sink" : "Net Source";
  const headlineColor = (rootNet ?? 0) < 0 ? REMOVALS_COLOR : EMISSIONS_COLOR;

  if (nodes.length === 0) {
    return (
      <Flex
        align="center"
        justify="center"
        minH="120px"
        border="1px dashed"
        borderColor="border"
        rounded="md"
        p={4}
      >
        <Text fontSize="sm" color="fg.muted">
          No hierarchy data available for this chart.
        </Text>
      </Flex>
    );
  }

  return (
    <Flex direction="column" gap="16px" w="full">
      <Box>
        {/* Centred, not baseline-aligned: on a 26px figure a baseline drops the
            small mono caption to the number's foot rather than its middle. */}
        <Flex align="center" gap="8px" wrap="wrap">
          <Text
            fontFamily="body"
            fontSize="26px"
            fontWeight="medium"
            lineHeight="1.1"
            color={headlineColor}
            css={{ fontVariantNumeric: "tabular-nums" }}
          >
            {rootNet == null ? "—" : signed.format(rootNet)}
          </Text>
          <Text fontFamily="mono" fontSize="11px" color="#656E7B">
            MgCO2e/yr · {direction}
            {fullyExpanded ? " · Full detail" : ""}
          </Text>
        </Flex>
        <Text fontFamily="body" fontSize="13px" color="#282D33" mt="2px">
          Annual average · Land use 2016–24 (30 m) · Agriculture fixed 2020 (~10
          km)
        </Text>
      </Box>

      {issues.length > 0 && (
        <Box
          border="1px solid"
          borderColor="#F0C36D"
          bg="#FCF3DE"
          rounded="4px"
          p="8px 10px"
        >
          <Text fontFamily="body" fontSize="12px" color="#6B4E12">
            {issues.length} level{issues.length > 1 ? "s" : ""} of this tree
            don&apos;t sum to their reported total — a mixed-resolution rollup
            like this can drift out of reconciliation with the dashboard figures
            it&apos;s meant to match.
          </Text>
        </Box>
      )}

      <Box overflowX="auto">
        <GhgFluxTreeChart rows={rows} measure={measure} onToggle={toggleNode} />
      </Box>

      <TreeLegend measure={measure} />
    </Flex>
  );
}
