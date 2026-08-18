"use client";
import { Box, Flex, Text } from "@chakra-ui/react";

import {
  isPaintReference,
  type NetFluxLegend as NetFluxLegendSpec,
  type NetFluxLegendItem,
} from "../model/net-flux-variants";

const NET_FLUX_LINE_COLOR = "#172b7a";

/**
 * Hatch patterns for the fixed-2020 agriculture series. Rendered once per
 * chart into a zero-size SVG; `url(#…)` paint references resolve document-wide,
 * so both the Recharts bars and the legend swatches below can use them.
 */
export function NetFluxHatchDefs() {
  return (
    <svg
      width={0}
      height={0}
      aria-hidden
      focusable="false"
      style={{ position: "absolute" }}
    >
      <defs>
        <pattern
          id="net-flux-hatch-livestock"
          width="6"
          height="6"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="6" height="6" fill="#d8bd9d" />
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="6"
            stroke="#b9925f"
            strokeWidth="2.5"
          />
        </pattern>
        <pattern
          id="net-flux-hatch-cropland"
          width="6"
          height="6"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="6" height="6" fill="#e8d5bb" />
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="6"
            stroke="#cbab7d"
            strokeWidth="2.5"
          />
        </pattern>
        <pattern
          id="net-flux-hatch-agriculture"
          width="6"
          height="6"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="6" height="6" fill="#d8bd9d" />
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="6"
            stroke="#b9925f"
            strokeWidth="2.5"
          />
        </pattern>
      </defs>
    </svg>
  );
}

/** 14×10 swatch — an SVG rect when the fill is a hatch pattern, else a box. */
function Swatch({ color }: { color: string }) {
  if (isPaintReference(color)) {
    return (
      <Box as="span" w="14px" h="10px" flexShrink={0} lineHeight={0}>
        <svg width="14" height="10" aria-hidden focusable="false">
          <rect width="14" height="10" rx="2" fill={color} />
        </svg>
      </Box>
    );
  }
  return <Box w="14px" h="10px" rounded="2px" bg={color} flexShrink={0} />;
}

function LegendEntry({ item }: { item: NetFluxLegendItem }) {
  return (
    <Flex align="center" gap="5px">
      <Swatch color={item.color} />
      <Text
        fontFamily="body"
        fontSize="9.5px"
        fontWeight="normal"
        color="#3A4048"
      >
        {item.label}
      </Text>
    </Flex>
  );
}

/** The "Net flux" line entry — a 16×2 rule rather than a filled swatch. */
function NetFluxLineEntry() {
  return (
    <Flex align="center" gap="5px">
      <Box w="16px" h="2px" bg={NET_FLUX_LINE_COLOR} flexShrink={0} />
      <Text
        fontFamily="body"
        fontSize="9.5px"
        fontWeight="normal"
        color="#3A4048"
      >
        Net flux
      </Text>
    </Flex>
  );
}

function GroupHeading({ children }: { children: string }) {
  return (
    <Text
      fontFamily="mono"
      fontSize="8px"
      fontWeight="normal"
      lineHeight="16px"
      textTransform="capitalize"
      color="#737C94"
    >
      {children}
    </Text>
  );
}

/**
 * The design's own legend: emissions and removals as labelled columns with the
 * net-flux line pinned to the bottom of the removals column, replacing
 * ChartWidget's generic top-aligned legend. Collapses to a single wrapped row
 * for the "net" measure, which has no emissions/removals split.
 */
export function NetFluxLegend({ legend }: { legend: NetFluxLegendSpec }) {
  return (
    <Box bg="#F6F6F6" rounded="4px" p="8px" w="full">
      {legend.layout === "flat" ? (
        <Flex wrap="wrap" gap="6px 10px">
          {legend.emissions.map((item) => (
            <LegendEntry key={item.label} item={item} />
          ))}
          <NetFluxLineEntry />
        </Flex>
      ) : (
        <Flex gap="20px" align="stretch" wrap="wrap">
          <Flex direction="column" gap="4px">
            <GroupHeading>Emissions</GroupHeading>
            <Flex direction="column" gap="4px">
              {legend.emissions.map((item) => (
                <LegendEntry key={item.label} item={item} />
              ))}
            </Flex>
          </Flex>
          <Flex direction="column" justify="space-between" gap="20px">
            <Flex direction="column" gap="4px">
              <GroupHeading>Removals</GroupHeading>
              <Flex direction="column" gap="4px">
                {legend.removals.map((item) => (
                  <LegendEntry key={item.label} item={item} />
                ))}
              </Flex>
            </Flex>
            <NetFluxLineEntry />
          </Flex>
        </Flex>
      )}
    </Box>
  );
}
