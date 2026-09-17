"use client";
import { Button, Flex, Menu, Portal, Text } from "@chakra-ui/react";
import { CaretDownIcon } from "@phosphor-icons/react";

import { InfoTooltip } from "./InfoTooltip";

export interface PillOption {
  value: string;
  label: string;
}

export interface PillProps {
  label: string;
  value: string;
  options: PillOption[];
  onSelect: (value: string) => void;
  /** Matches the widest option label across both curated net-flux/tree pills. */
  minW?: string;
  /** Tooltip body for an info icon rendered inside the pill, after the caret. */
  info?: React.ReactNode;
}

/**
 * The design's dropdown pill: a mono uppercase label, the current value, and a
 * caret. Shared by the net-flux DETAIL/MEASURE pills and the flux-tree MEASURE
 * pill — both curated LGMS charts render the identical control, styled from
 * the same design spec.
 *
 * The pill chrome sits on a wrapper so the optional info icon is a sibling of
 * the menu trigger rather than a child of its `<button>`: hovering the icon
 * opens only the tooltip, with no click guards needed.
 */
export function Pill({
  label,
  value,
  options,
  onSelect,
  minW = "140px",
  info,
}: PillProps) {
  return (
    <Flex
      align="center"
      gap="4px"
      h="24px"
      pr={info ? "8px" : 0}
      bg="white"
      border="1px solid"
      borderColor="#E0E2E5"
      rounded="4px"
      _hover={{ bg: "neutral.100" }}
    >
      <Menu.Root positioning={{ placement: "bottom-start" }}>
        <Menu.Trigger asChild>
          <Button
            variant="plain"
            h="100%"
            pl="8px"
            pr={info ? 0 : "8px"}
            gap="4px"
            border="none"
            // The button recipe sizes every descendant svg to 20px; let the
            // caret keep its declared 12px.
            _icon={{ width: "auto", height: "auto" }}
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
            <Menu.Content minW={minW} zIndex={1400}>
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
      {info && <InfoTooltip>{info}</InfoTooltip>}
    </Flex>
  );
}
