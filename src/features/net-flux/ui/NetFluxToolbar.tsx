"use client";
import { Box, Button, Flex, Menu, Portal, Text } from "@chakra-ui/react";
import { CaretDownIcon } from "@phosphor-icons/react";

import { useNetFluxView } from "./use-net-flux-view";
import { type NetFluxMeasure } from "../model/net-flux-variants";

const MEASURE_LABEL: Record<NetFluxMeasure, string> = {
  gross: "Gross",
  net: "Net",
};
const MEASURE_OPTIONS: NetFluxMeasure[] = ["gross", "net"];

interface PillProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onSelect: (value: string) => void;
}

/**
 * The design's dropdown pill: a mono uppercase label, the current value, and a
 * caret — distinct from the segmented Chart/Table toggle inside the card.
 */
function Pill({ label, value, options, onSelect }: PillProps) {
  return (
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
          aria-label={`${label}: ${value}`}
        >
          <Text
            fontFamily="mono"
            fontSize="10px"
            fontWeight="400"
            lineHeight="16px"
            letterSpacing="0.5px"
            color="#4A64CB"
          >
            {label}
          </Text>
          <Text
            fontFamily="body"
            fontSize="12px"
            fontWeight="medium"
            color="#656E7B"
          >
            {value}
          </Text>
          <CaretDownIcon size={12} color="#656E7B" />
        </Button>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content minW="160px" zIndex={1400}>
            {options.map((option) => (
              <Menu.Item
                key={option.value}
                value={option.value}
                onSelect={() => onSelect(option.value)}
                fontSize="12px"
              >
                {option.label}
              </Menu.Item>
            ))}
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}

/**
 * MEASURE control for the net-flux insight. In the workspace this sits above
 * the widget card on the shell background, per the design's "Widget toolbar
 * (reusable)" frame; elsewhere (dashboards, /chart-debug) `WidgetMessage`
 * renders it inline at the top of the card instead.
 *
 * There is no DETAIL control: project-zeno's `LGMSChartGenerator` ships Full
 * detail / Category / Summary as three separate charts, so the detail level is
 * chosen by moving between insights rather than by re-slicing one payload.
 */
export function NetFluxToolbar({
  widgetId,
  showDivider = true,
}: {
  widgetId: string;
  showDivider?: boolean;
}) {
  const { measure, setMeasure } = useNetFluxView(widgetId);

  return (
    <Flex direction="column" gap="8px">
      {showDivider && <Box borderTop="1px solid" borderColor="#DDE2F5" />}
      <Flex gap="8px" wrap="wrap">
        <Pill
          label="MEASURE"
          value={MEASURE_LABEL[measure]}
          options={MEASURE_OPTIONS.map((value) => ({
            value,
            label: MEASURE_LABEL[value],
          }))}
          onSelect={(value) => setMeasure(value as NetFluxMeasure)}
        />
      </Flex>
    </Flex>
  );
}
