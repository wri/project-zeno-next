import { Box, Flex, Text, VisuallyHidden } from "@chakra-ui/react";

import { SymbolColor, SymbolColorValue } from "./types";
import { makeColorRamp } from "./makeColorRamp";
import { ColorBar } from "./ColorBar";

/**
 * LegendSequential component rendering a sequential color ramp with min/max
 * labels.
 * @param props.min - Minimum value label.
 * @param props.max - Maximum value label.
 * @param props.color - Array of colors or color/value stops for the ramp.
 */
export function LegendSequential(props: {
  min: number;
  max: number;
  color: SymbolColor[] | SymbolColorValue[];
}) {
  const { min, max, color } = props;

  const colorRamp = makeColorRamp(color);
  if (!colorRamp) return null;

  return (
    <Box w="100%">
      <ColorBar color={colorRamp} />
      <Flex justifyContent="space-between" fontSize="xs">
        <VisuallyHidden>From</VisuallyHidden>
        <Text as="span">{min}</Text>
        <VisuallyHidden>to</VisuallyHidden>
        <Text as="span">{max}</Text>
      </Flex>
    </Box>
  );
}
