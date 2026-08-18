"use client";
import { Box, Button, Flex, Menu, Portal, Text } from "@chakra-ui/react";
import { CaretDownIcon } from "@phosphor-icons/react";

import { useNetFluxView } from "./use-net-flux-view";
import {
  DETAIL_LABEL,
  type NetFluxDetail,
  type NetFluxMeasure,
} from "../model/net-flux-variants";

const DETAIL_OPTIONS: NetFluxDetail[] = ["full", "categories", "summary"];

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
  disabled?: boolean;
}

/**
 * The design's dropdown pill: a mono uppercase label, the current value, and a
 * caret — distinct from the segmented Chart/Table toggle inside the card.
 */
function Pill({ label, value, options, onSelect, disabled }: PillProps) {
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
          disabled={disabled}
          opacity={disabled ? 0.5 : 1}
          _hover={disabled ? undefined : { bg: "neutral.100" }}
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
 * DETAIL / MEASURE controls for the net-flux insight. In the workspace these
 * sit above the widget card on the shell background, per the design's
 * "Widget toolbar (reusable)" frame; elsewhere (dashboards, /chart-debug)
 * `WidgetMessage` renders them inline at the top of the card instead.
 */
export function NetFluxToolbar({
  widgetId,
  showDivider = true,
}: {
  widgetId: string;
  showDivider?: boolean;
}) {
  const { detail, measure, setDetail, setMeasure } = useNetFluxView(widgetId);
  const isNetOnly = measure === "net";

  return (
    <Flex direction="column" gap="8px">
      {showDivider && <Box borderTop="1px solid" borderColor="#DDE2F5" />}
      <Flex gap="8px" wrap="wrap">
        <Pill
          label="DETAIL"
          // The net measure collapses the breakdown entirely, so the detail
          // level no longer applies — the design greys the pill out.
          value={DETAIL_LABEL[detail]}
          options={DETAIL_OPTIONS.map((value) => ({
            value,
            label: DETAIL_LABEL[value],
          }))}
          onSelect={(value) => setDetail(value as NetFluxDetail)}
          disabled={isNetOnly}
        />
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
