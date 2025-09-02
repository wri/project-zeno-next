import { Grid, GridItem, Text, Tooltip } from "@chakra-ui/react";

import { SymbolColorValue } from "./types";
import { ColorBar } from "./ColorBar";

/**
 * LegendCategorical component rendering a grid of categorical color blocks with
 * labels.
 * @param props.items - Array of color/value pairs to display.
 */
export function LegendCategorical(props: { items: SymbolColorValue[] }) {
  const { items } = props;

  return (
    <Grid
      as="ul"
      gap={1}
      m={0}
      p={0}
      w="100%"
      listStyle="none"
      gridAutoFlow="column"
      gridAutoColumns="minmax(0, 1fr)"
    >
      {items.map((item) => (
        <Tooltip.Root
          key={item.color}
          positioning={{ placement: "top" }}
          openDelay={50}
        >
          <Tooltip.Trigger>
            <GridItem as="li" flexDir="column" maxW="100%">
              <ColorBar color={item.color} borderRadius="3px" />
              <Text textOverflow="ellipsis" wordWrap="normal" overflow="hidden">
                {item.value}
              </Text>
            </GridItem>
          </Tooltip.Trigger>
          <Tooltip.Positioner>
            <Tooltip.Content>
              <Tooltip.Arrow>
                <Tooltip.ArrowTip />
              </Tooltip.Arrow>
              {item.value}
            </Tooltip.Content>
          </Tooltip.Positioner>
        </Tooltip.Root>
      ))}
    </Grid>
  );
}
