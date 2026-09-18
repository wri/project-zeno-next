"use client";
import { Box, Flex, Text } from "@chakra-ui/react";

import type {
  FluxTooltipModel,
  FluxTooltipTotal,
} from "@/src/shared/lib/flux-tooltip";
import { signed } from "@/src/shared/lib/number-format";

import { Swatch } from "./Swatch";

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
const SWATCH_SIZE = 9;
/** Separates the total from the rows above it. */
const RULE_ABOVE = {
  mt: "6px",
  pt: "5px",
  borderTop: "1px solid",
  borderColor: PANEL_RULE,
} as const;

/**
 * The design's panel width. The longest row label, "Cropland mgmt (static)",
 * fits beside its value in at most two lines. Exported so a chart that pins
 * the tooltip (rather than letting recharts follow the cursor) can place it.
 */
export const FLUX_TOOLTIP_WIDTH = 196;

interface FluxTooltipProps extends FluxTooltipModel {
  /** The heading: the hovered year for a time series, the category for a tree. */
  title?: string | number;
}

interface LineProps extends FluxTooltipTotal {
  /** The total's treatment: bold, white label. */
  emphasis?: boolean;
  /** Draw the rule above — only when rows precede the line, else it would
   * read as a heading underline. */
  ruled?: boolean;
}

function Line({ label, value, color, emphasis, ruled }: LineProps) {
  return (
    <Flex
      align="flex-start"
      gap="6px"
      lineHeight="1.35"
      fontWeight={emphasis ? "bold" : "normal"}
      {...(ruled ? RULE_ABOVE : {})}
    >
      {color && (
        <Box pt="2px">
          <Swatch color={color} width={SWATCH_SIZE} height={SWATCH_SIZE} />
        </Box>
      )}
      <Text flex="1" minW={0} color={emphasis ? VALUE_COLOR : LABEL_COLOR}>
        {label}
      </Text>
      <Text
        color={VALUE_COLOR}
        whiteSpace="nowrap"
        css={{ fontVariantNumeric: "tabular-nums" }}
      >
        {signed.format(value)}
      </Text>
    </Flex>
  );
}

/**
 * Hover tooltip shared by the curated LGMS flux charts, as the design draws
 * it: a heading, one swatched line per figure, then the net total, bold,
 * below a rule. Values carry no unit — the chart's own axis states it. Each
 * chart supplies its own model, so the two never drift in layout while
 * saying different things.
 */
export function FluxTooltip({ title, rows, total }: FluxTooltipProps) {
  if (rows.length === 0 && !total) return null;

  return (
    <Box
      bg={PANEL_BG}
      borderRadius="6px"
      boxShadow="md"
      px="10px"
      py="8px"
      w={`${FLUX_TOOLTIP_WIDTH}px`}
      fontFamily="mono"
      fontSize="9.5px"
      fontWeight="normal"
    >
      {title != null && (
        <Text color={VALUE_COLOR} fontWeight="medium" fontSize="11px" mb="6px">
          {title}
        </Text>
      )}
      {rows.length > 0 && (
        <Flex direction="column" gap="3px">
          {rows.map((row) => (
            <Line
              key={row.key}
              label={row.label}
              value={row.value}
              color={row.color}
            />
          ))}
        </Flex>
      )}
      {total && <Line {...total} emphasis ruled={rows.length > 0} />}
    </Box>
  );
}
