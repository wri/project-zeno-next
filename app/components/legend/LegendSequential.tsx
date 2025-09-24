import { Box, Flex, Text, VisuallyHidden } from "@chakra-ui/react";

import { SymbolColor, SymbolColorValue } from "./types";
import { makeColorRamp } from "./makeColorRamp";
import { ColorBar } from "./ColorBar";

/**
 * LegendSequential component rendering a sequential color ramp with min/max
 * labels.
 * @param props.minLabel - Minimum value label.
 * @param props.maxLabel - Maximum value label.
 * @param props.color - Array of colors or color/value stops for the ramp.
 */
export function LegendSequential(props: {
  minLabel: string;
  maxLabel: string;
  color: SymbolColor[] | SymbolColorValue[];
}) {
  const { minLabel, maxLabel, color } = props;

  const colorRamp = makeColorRamp(color);
  if (!colorRamp) return null;

  return (
    <Box w="100%">
      <ColorBar color={colorRamp} />
      <Flex justifyContent="space-between" fontSize="xs">
        <VisuallyHidden>From</VisuallyHidden>
        <Text as="span">{minLabel}</Text>
        <VisuallyHidden>to</VisuallyHidden>
        <Text as="span">{maxLabel}</Text>
      </Flex>
    </Box>
  );
}
