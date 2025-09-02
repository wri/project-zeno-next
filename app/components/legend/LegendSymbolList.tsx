import { ReactNode } from "react";
import { Flex, Box, ColorSwatch } from "@chakra-ui/react";

import { SymbolColorValue } from "./types";

export type LegendSymbolItem = SymbolColorValue &
  (
    | {
        type: "line" | "dashed";
        icon?: never;
      }
    | {
        type?: never;
        icon?: never;
      }
    | {
        type: "icon";
        icon: ReactNode;
      }
  );

/**
 * LegendSymbolList component rendering a vertical list of color swatches with
 * labels.
 * @param props.items - Array of color/value pairs to display.
 */
export function LegendSymbolList(props: { items: LegendSymbolItem[] }) {
  const { items } = props;

  return (
    <Flex
      as="ul"
      gap={2}
      m={0}
      p={0}
      w="100%"
      listStyle="none"
      flexDir="column"
    >
      {items.map((item) => (
        <Flex as="li" gap={2} alignItems="center" key={item.color}>
          {item.type === "line" ? (
            <Box width={4} mt="1px" borderBottom={`2px solid ${item.color}`} />
          ) : item.type === "dashed" ? (
            <Box width={4} mt="1px" borderBottom={`2px dashed ${item.color}`} />
          ) : item.type === "icon" ? (
            <Flex boxSize={4} alignItems="center" justifyContent="center">
              {item.icon}
            </Flex>
          ) : (
            <ColorSwatch size="xs" value={item.color} />
          )}{" "}
          {item.value}
        </Flex>
      ))}
    </Flex>
  );
}
