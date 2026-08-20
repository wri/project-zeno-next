"use client";
import { Box, Button, Flex, Menu, Portal, Text } from "@chakra-ui/react";
import { CaretDownIcon } from "@phosphor-icons/react";

import type { InsightWidget } from "@/app/types/chat";

import { parseFluxNodes, type FluxMeasure } from "../model/hierarchy";
import { treeViewKey } from "../model/tree-view-store";
import { useTreeView } from "./use-tree-view";

const MEASURE_LABEL: Record<FluxMeasure, string> = {
  net: "Net",
  gross: "Gross",
};
const MEASURE_OPTIONS: FluxMeasure[] = ["net", "gross"];

/**
 * The design's MEASURE dropdown pill. Unlike the time-series insight there is
 * no DETAIL pill here — detail is driven by the tree's own disclosure carets,
 * so the "summary" / "categories" / "full view" frames are expansion states
 * rather than a separate control.
 *
 * Rendered on the workspace shell above the widget card, so it reads from the
 * shared view store rather than taking the selection as a prop.
 */
export function GhgFluxMeasurePill({
  widget,
  showDivider = true,
}: {
  widget: InsightWidget;
  showDivider?: boolean;
}) {
  const nodes = parseFluxNodes(widget.data);
  const { measure, setMeasure } = useTreeView(treeViewKey(widget), nodes);

  return (
    <Flex direction="column" gap="8px">
      {showDivider && <Box borderTop="1px solid" borderColor="#DDE2F5" />}
      <Flex>
        <Menu.Root positioning={{ placement: "bottom-start" }}>
          <Menu.Trigger asChild>
            <Button
              h="24px"
              minH="24px"
              px="8px"
              py="5px"
              gap="4px"
              bg="white"
              border="1px solid"
              borderColor="#E0E2E5"
              rounded="4px"
              variant="outline"
              _hover={{ bg: "neutral.100" }}
              aria-label={`Measure: ${MEASURE_LABEL[measure]}`}
            >
              <Text
                fontFamily="mono"
                fontSize="10px"
                fontWeight="400"
                lineHeight="16px"
                letterSpacing="0.5px"
                color="#4A64CB"
              >
                MEASURE
              </Text>
              <Text
                fontFamily="body"
                fontSize="12px"
                fontWeight="medium"
                color="#656E7B"
              >
                {MEASURE_LABEL[measure]}
              </Text>
              <CaretDownIcon size={12} color="#656E7B" />
            </Button>
          </Menu.Trigger>
          <Portal>
            <Menu.Positioner>
              <Menu.Content minW="140px" zIndex={1400}>
                {MEASURE_OPTIONS.map((option) => (
                  <Menu.Item
                    key={option}
                    value={option}
                    onSelect={() => setMeasure(option)}
                    fontSize="12px"
                  >
                    {MEASURE_LABEL[option]}
                  </Menu.Item>
                ))}
              </Menu.Content>
            </Menu.Positioner>
          </Portal>
        </Menu.Root>
      </Flex>
    </Flex>
  );
}
