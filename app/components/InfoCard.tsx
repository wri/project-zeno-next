"use client";
import { Box, Flex, Text } from "@chakra-ui/react";
import * as React from "react";

export interface InfoCardProps {
  /** Element rendered inside the left 80x80 thumbnail slot — image or icon. */
  thumbnail: React.ReactNode;
  /** Background applied to the thumbnail slot. Defaults to white. */
  thumbnailBg?: string;
  /** Small uppercase mono label above the title (e.g. "ANALYSIS", "DATA"). */
  typeLabel?: string;
  /** Hex color for the type label. */
  typeLabelColor?: string;
  /** Bold sans-serif title text. */
  title: string;
  /** Mono caption shown under the title. */
  description?: string;
  onClick?: () => void;
  /** When true, swaps the gray border for a primary highlight border. */
  selected?: boolean;
  /** Optional action node (e.g. info icon) anchored to the right of the title row. */
  titleActions?: React.ReactNode;
}

export function InfoCard({
  thumbnail,
  thumbnailBg = "#FFFFFF",
  typeLabel,
  typeLabelColor = "#656E7B",
  title,
  description,
  onClick,
  selected = false,
  titleActions,
}: InfoCardProps) {
  return (
    <Flex
      flexDirection="row"
      alignItems="center"
      w="100%"
      h="80px"
      bg="#FFFFFF"
      border={selected ? "2px solid" : "1px solid"}
      borderColor={selected ? "primary.solid" : "rgba(19, 22, 25, 0.3)"}
      borderRadius="4px"
      overflow="hidden"
      cursor={onClick ? "pointer" : "default"}
      onClick={onClick}
      _hover={onClick ? { borderColor: "primary.300" } : undefined}
      transition="border-color 0.16s ease"
    >
      <Flex
        w="80px"
        h="80px"
        minH="80px"
        flexShrink={0}
        bg={thumbnailBg}
        borderRight="1px solid rgba(19, 22, 25, 0.1)"
        alignItems="center"
        justifyContent="center"
      >
        {thumbnail}
      </Flex>
      <Box
        flex="1"
        display="flex"
        flexDirection="column"
        gap="2px"
        px="16px"
        py={0}
        minW={0}
      >
        {typeLabel && (
          <Text
            fontFamily="mono"
            fontSize="10px"
            fontWeight="normal"
            lineHeight="16px"
            letterSpacing="0.5px"
            color={typeLabelColor}
            textTransform="uppercase"
            whiteSpace="nowrap"
            overflow="hidden"
            textOverflow="ellipsis"
          >
            {typeLabel}
          </Text>
        )}
        <Flex align="center" gap="8px" minW={0}>
          <Text
            fontFamily="body"
            fontSize="12px"
            fontWeight="medium"
            lineHeight="150%"
            color="#3A4048"
            flex="1"
            minW={0}
            whiteSpace="nowrap"
            overflow="hidden"
            textOverflow="ellipsis"
          >
            {title}
          </Text>
          {titleActions}
        </Flex>
        {description && (
          <Text
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
    </Flex>
  );
}
