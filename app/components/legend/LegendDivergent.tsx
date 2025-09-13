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
  unit: string;
  minLabel: string;
  maxLabel: string;
  color: SymbolColor[] | SymbolColorValue[];
}) {
  const { unit, minLabel, maxLabel, color } = props;
  const colorRamp = makeColorRamp(
    color as SymbolColor[] | SymbolColorValue[]
  );
  if (!colorRamp) return null;

  return (
    <Box w="100%">
      <Flex justifyContent="flex-end">
        <Text as="span" fontSize="xs">
          {unit}
        </Text>
      </Flex>
      <ColorBar color={colorRamp} />
      <Box position="relative" h="20px">
        <Flex justifyContent="space-between" fontSize="xs" position="absolute" w="100%">
            <Text as="span">{minLabel}</Text>
            <Text as="span">{maxLabel}</Text>
        </Flex>
        <Flex justifyContent="center" fontSize="xs" position="absolute" w="100%">
            <Text as="span">0</Text>
        </Flex>
      </Box>
    </Box>
  );
}
