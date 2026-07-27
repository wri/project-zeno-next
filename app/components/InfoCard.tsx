"use client";
import { Box, Flex, Text } from "@chakra-ui/react";
import { ArrowRightIcon } from "@phosphor-icons/react";
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
  /** Optional icon rendered immediately before the type label. */
  typeLabelIcon?: React.ReactNode;
  /** Bold sans-serif title text. */
  title: string;
  /** Mono caption shown under the title. */
  description?: string;
  onClick?: () => void;
  /** When true, swaps the gray border for a primary highlight border. */
  selected?: boolean;
  /** Optional action node (e.g. info icon) anchored to the right of the title row. */
  titleActions?: React.ReactNode;
  /** Optional action node placed inline after the description text. */
  descriptionActions?: React.ReactNode;
  /** Opts into the navigation-card treatment: a right arrow revealed on
   * hover and a pressed state that tints the card (primary shades) while
   * active. Pair with onClick. */
  interactive?: boolean;
}

export function InfoCard({
  thumbnail,
  thumbnailBg = "#FFFFFF",
  typeLabel,
  typeLabelColor = "#656E7B",
  typeLabelIcon,
  title,
  description,
  onClick,
  selected = false,
  titleActions,
  descriptionActions,
  interactive = false,
}: InfoCardProps) {
  return (
    <Flex
      flexDirection="row"
      alignItems="center"
      position="relative"
      w="100%"
      h="80px"
      bg="#FFFFFF"
      border={selected ? "2px solid" : "1px solid"}
      borderColor={selected ? "primary.solid" : "rgba(19, 22, 25, 0.3)"}
      borderRadius="4px"
      overflow="hidden"
      cursor={onClick ? "pointer" : "default"}
      onClick={onClick}
      // The interactive card is the sole affordance for opening the dashboard,
      // so it must be reachable and operable from the keyboard, not just the
      // mouse. Expose it as a button and activate on Enter/Space.
      role={interactive && onClick ? "button" : undefined}
      tabIndex={interactive && onClick ? 0 : undefined}
      onKeyDown={
        interactive && onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      _hover={
        onClick && !interactive ? { borderColor: "primary.300" } : undefined
      }
      _active={
        interactive && onClick
          ? { bg: "#F0F4FF", borderColor: "#0049AA" }
          : undefined
      }
      _focusVisible={
        interactive && onClick
          ? { outline: "2px solid #0049AA", outlineOffset: "2px" }
          : undefined
      }
      css={
        interactive
          ? {
              "&:hover .info-card-arrow": { opacity: 1 },
              "&:active .info-card-arrow": { color: "#0049AA" },
            }
          : undefined
      }
      transition="border-color 0.16s ease, background 0.16s ease"
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
        pl="16px"
        pr={interactive ? "44px" : "16px"}
        py={0}
        minW={0}
      >
        {typeLabel && (
          <Flex align="center" gap="4px" minW={0}>
            {typeLabelIcon}
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
          </Flex>
        )}
        <Flex align="center" gap="8px" minW={0}>
          <Text
            fontFamily="body"
            fontSize="12px"
            fontWeight="medium"
            lineHeight="150%"
            color="#3A4048"
            whiteSpace="nowrap"
            overflow="hidden"
            textOverflow="ellipsis"
          >
            {title}
          </Text>
          {titleActions}
        </Flex>
        {(description || descriptionActions) && (
          <Flex align="center" gap="8px" minW={0}>
            {description && (
              <Text
                flex="1"
                minW={0}
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
            {descriptionActions}
          </Flex>
        )}
      </Box>
      {interactive && (
        <Flex
          className="info-card-arrow"
          position="absolute"
          right="16px"
          top="50%"
          transform="translateY(-50%)"
          opacity={0}
          transition="opacity 0.16s ease, color 0.16s ease"
          color="#656E7B"
          pointerEvents="none"
          aria-hidden="true"
        >
          <ArrowRightIcon size={20} color="currentColor" />
        </Flex>
      )}
    </Flex>
  );
}
