import { Box, Flex, Text, VisuallyHidden } from "@chakra-ui/react";

import { SymbolColor, SymbolColorValue } from "./types";
import { makeColorRamp } from "./makeColorRamp";
import { ColorBar } from "./ColorBar";

/**
 * LegendDivergent component rendering a divergent color ramp with min/zero/max
 * labels.
 * @param props.min - Minimum value label.
 * @param props.max - Maximum value label.
 * @param props.color - Array of colors or color/value stops for the ramp.
 */
export function LegendDivergent(props: {
  min: number;
  max: number;
  color: SymbolColor[] | SymbolColorValue[];
}) {
  const { min, max, color } = props;

  const reversedColors = [...color].reverse().slice(1);
  const colorRamp = makeColorRamp(
    color.concat(reversedColors) as SymbolColor[] | SymbolColorValue[]
  );
  if (!colorRamp) return null;

  return (
    <Box w="100%">
      <ColorBar color={colorRamp} />
      <Flex justifyContent="space-between" fontSize="xs">
        <VisuallyHidden>From</VisuallyHidden>
        <Text as="span">{min}</Text>
        <Text as="span">0</Text>
        <VisuallyHidden>to</VisuallyHidden>
        <Text as="span">{max}</Text>
      </Flex>
    </Box>
  );
}
