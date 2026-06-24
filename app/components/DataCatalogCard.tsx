"use client";

import { Box, Flex, IconButton, Switch, Text } from "@chakra-ui/react";
import { InfoIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import {
  DATA_CATALOG_CARD_HEIGHT_PX,
  DATA_CATALOG_CARD_WIDTH_PX,
} from "@/app/explorationLayout";

import { Tooltip } from "./ui/tooltip";

export interface DataCatalogCardProps {
  thumbnail: ReactNode;
  typeLabel?: string;
  typeLabelColor?: string;
  title: string;
  description?: string;
  selected?: boolean;
  showOnMap: boolean;
  onShowOnMapChange: (checked: boolean) => void;
  onInfoClick: () => void;
}

/**
 * Dataset card for the data-catalog panel — taller than the shared InfoCard,
 * with metadata stacked above a divider and a labelled show-on-map toggle.
 */
export function DataCatalogCard({
  thumbnail,
  typeLabel = "DATA",
  typeLabelColor = "#1AA915",
  title,
  description,
  selected = false,
  showOnMap,
  onShowOnMapChange,
  onInfoClick,
}: DataCatalogCardProps) {
  return (
    <Flex
      w={`${DATA_CATALOG_CARD_WIDTH_PX}px`}
      maxW="100%"
      h={`${DATA_CATALOG_CARD_HEIGHT_PX}px`}
      flexShrink={0}
      bg="#FFFFFF"
      border={selected ? "2px solid" : "1px solid"}
      borderColor={selected ? "primary.solid" : "rgba(19, 22, 25, 0.3)"}
      borderRadius="4px"
      overflow="hidden"
      transition="border-color 0.16s ease"
    >
      <Flex
        w="96px"
        h="100%"
        flexShrink={0}
        bg="#FFFFFF"
        borderRight="1px solid rgba(19, 22, 25, 0.1)"
        overflow="hidden"
      >
        {thumbnail}
      </Flex>
      <Flex flex="1" flexDirection="column" minW={0} h="100%">
        <Box flex="1" px="16px" pt="12px" pb="8px" minW={0} minH={0}>
          {typeLabel && (
            <Text
              fontFamily="mono"
              fontSize="10px"
              fontWeight="normal"
              lineHeight="16px"
              letterSpacing="0.5px"
              color={typeLabelColor}
              textTransform="uppercase"
            >
              {typeLabel}
            </Text>
          )}
          <Flex align="center" gap="8px" mt="2px" minW={0}>
            <Text
              flex="1"
              minW={0}
              fontFamily="body"
              fontSize="12px"
              fontWeight="semibold"
              lineHeight="150%"
              color="#3A4048"
              whiteSpace="nowrap"
              overflow="hidden"
              textOverflow="ellipsis"
            >
              {title}
            </Text>
            <Tooltip
              content="Show dataset info"
              positioning={{ placement: "top" }}
              showArrow
              variant="dark"
            >
              <IconButton
                aria-label={`Show ${title} info`}
                size="2xs"
                variant="ghost"
                color="#656E7B"
                flexShrink={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onInfoClick();
                }}
              >
                <InfoIcon size={16} />
              </IconButton>
            </Tooltip>
          </Flex>
          {description && (
            <Text
              mt="2px"
              fontFamily="mono"
              fontSize="10px"
              fontWeight="normal"
              lineHeight="16px"
              color="#656E7B"
              whiteSpace="nowrap"
              overflow="hidden"
              textOverflow="ellipsis"
            >
              {description}
            </Text>
          )}
        </Box>
        <Box borderTop="1px solid" borderColor="rgba(19, 22, 25, 0.1)" />
        <Flex align="center" gap="8px" px="16px" py="10px" flexShrink={0}>
          <Switch.Root
            size="sm"
            checked={showOnMap}
            onCheckedChange={(e: { checked: boolean }) =>
              onShowOnMapChange(e.checked)
            }
            colorPalette="primary"
            flexShrink={0}
            aria-label={
              showOnMap ? `Hide ${title} from map` : `Show ${title} on map`
            }
          >
            <Switch.HiddenInput />
            <Switch.Control>
              <Switch.Thumb bg="white" />
            </Switch.Control>
          </Switch.Root>
          <Text fontFamily="body" fontSize="12px" color="#656E7B">
            Show on map
          </Text>
        </Flex>
      </Flex>
    </Flex>
  );
}
