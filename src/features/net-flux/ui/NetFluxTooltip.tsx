"use client";
import { Box, Flex, Text } from "@chakra-ui/react";

import { signed } from "@/src/shared/lib/number-format";

import {
  netFluxTooltipRows,
  type NetFluxTooltipEntry,
  type NetFluxTooltipRow,
} from "../model/net-flux-variants";
import { Swatch } from "./NetFluxLegend";

/**
 * Dark panel sampled from the design's export. It is deliberately not the
 * generic `bg.panel` tooltip the other charts use: this one sits on top of a
 * dense stack of light browns and greens, and only a dark card keeps its own
 * swatches legible against them.
 */
const PANEL_BG = "#1B1D29";
const PANEL_RULE = "rgba(255, 255, 255, 0.18)";
const LABEL_COLOR = "#DFE2EA";
const VALUE_COLOR = "#FFFFFF";
/** Wide enough for "Non-trees rem. non-trees" over two lines, per the design. */
const PANEL_WIDTH = 196;

interface NetFluxTooltipProps {
  active?: boolean;
  payload?: NetFluxTooltipEntry[];
  /** The hovered x value — the year, which the design uses as the heading. */
  label?: string | number;
  /** The stacking order, supplied by `ChartWidget`; see `netFluxTooltipRows`. */
  seriesOrder: readonly string[];
}

function Row({ row }: { row: NetFluxTooltipRow }) {
  return (
    <Flex align="flex-start" gap="6px" lineHeight="1.35">
      <Box pt="2px">
        <Swatch color={row.color} width={9} height={9} />
      </Box>
      <Text flex="1" minW={0} color={LABEL_COLOR}>
        {row.label}
      </Text>
      <Text
        color={VALUE_COLOR}
        whiteSpace="nowrap"
        css={{ fontVariantNumeric: "tabular-nums" }}
      >
        {signed.format(row.value)}
      </Text>
    </Flex>
  );
}

/**
 * Hover tooltip for the net-flux time series, as the design draws it: the
 * year, every series the active Measure/Detail actually draws — swatch, label
 * and value — then the total, bold, below a rule. Under the net measure the
 * single bar *is* the total, so it is the only line: labelled "Net source" or
 * "Net sink" and swatched by sign like the legend.
 *
 * It replaces `ChartWidget`'s generic `Chart.Tooltip` (wired through its
 * `tooltipContent` prop) for two reasons: that one can't render the hatched
 * agriculture swatches, and it lists cropland and livestock separately where
 * the design folds them into one "Agriculture (static)" row. Values carry no
 * unit — the y-axis title already states it, and repeating it on a dozen rows
 * is what made the tooltip outgrow the plot.
 */
export function NetFluxTooltip({
  active,
  payload,
  label,
  seriesOrder,
}: NetFluxTooltipProps) {
  if (!active || !payload?.length) return null;

  const { rows, total } = netFluxTooltipRows(payload, seriesOrder);
  if (rows.length === 0 && !total) return null;

  return (
    <Box
      bg={PANEL_BG}
      borderRadius="6px"
      boxShadow="md"
      px="10px"
      py="8px"
      w={`${PANEL_WIDTH}px`}
      fontFamily="mono"
      fontSize="9.5px"
      fontWeight="normal"
    >
      <Text color={VALUE_COLOR} fontWeight="medium" fontSize="11px" mb="6px">
        {label}
      </Text>
      {rows.length > 0 && (
        <Flex direction="column" gap="3px">
          {rows.map((row) => (
            <Row key={row.key} row={row} />
          ))}
        </Flex>
      )}
      {total && (
        <Flex
          align="center"
          gap="6px"
          // The rule separates the total from the rows above it; with no rows
          // — the net measure's single bar, or a year where every series drew
          // nothing — there is nothing to separate, so it would read as a
          // heading underline.
          {...(rows.length > 0
            ? {
                mt: "6px",
                pt: "5px",
                borderTop: "1px solid",
                borderColor: PANEL_RULE,
              }
            : {})}
          color={VALUE_COLOR}
          fontWeight="bold"
          lineHeight="1.35"
        >
          {total.color && <Swatch color={total.color} width={9} height={9} />}
          <Text flex="1" minW={0}>
            {total.label}
          </Text>
          <Text
            whiteSpace="nowrap"
            css={{ fontVariantNumeric: "tabular-nums" }}
          >
            {signed.format(total.value)}
          </Text>
        </Flex>
      )}
    </Box>
  );
}
