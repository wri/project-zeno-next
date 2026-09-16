"use client";
import { Box, Button, Flex, Menu, Portal, Text } from "@chakra-ui/react";
import { CaretDownIcon, InfoIcon } from "@phosphor-icons/react";

import { Tooltip } from "@/app/components/ui/tooltip";

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
  /** When set, renders an info icon next to the pill with a dark tooltip. */
  info?: React.ReactNode;
}

/**
 * The design's dropdown pill: a mono uppercase label, the current value, and a
 * caret. Shared by the net-flux DETAIL/MEASURE pills and the flux-tree MEASURE
 * pill — both curated LGMS charts render the identical control, styled from
 * the same design spec.
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
    <Flex align="center" gap="4px">
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
      {info && (
        <Tooltip
          content={info}
          variant="dark"
          showArrow
          openDelay={200}
          positioning={{ placement: "bottom" }}
        >
          <Box as="span" display="inline-flex" cursor="pointer" flexShrink={0}>
            <InfoIcon size={16} color="#656E7B" />
          </Box>
        </Tooltip>
      )}
    </Flex>
  );
}
