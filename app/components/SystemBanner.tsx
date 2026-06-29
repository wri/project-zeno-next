"use client";

import { useEffect, useState } from "react";
import { Box, CloseButton, Flex, Icon, Link, Text } from "@chakra-ui/react";
import { ArrowSquareOutIcon, TreeIcon } from "@phosphor-icons/react";
import {
  SYSTEM_BANNER_BODY,
  SYSTEM_BANNER_DISMISSED_EVENT,
  SYSTEM_BANNER_HEADING,
  SYSTEM_BANNER_LINK_LABEL,
  SYSTEM_BANNER_LINK_URL,
  SYSTEM_BANNER_PREVIEW_NOTE,
  SYSTEM_BANNER_STORAGE_KEY,
} from "@/app/constants/system-banner";

interface SystemBannerProps {
  /**
   * When true the banner shows a close button and remembers its dismissed
   * state in localStorage (used on the app page). When false (the default) it
   * is always visible and cannot be dismissed (used on the landing page).
   */
  dismissible?: boolean;
}

// Shared styling for the banner's three stacked text lines.
const lineTextStyle = {
  fontSize: "xs",
  lineHeight: "1.5",
  color: "neutral.900",
} as const;

/**
 * Site-wide rebrand announcement banner, rendered from the Figma "System
 * message" component. Reused on the landing page (non-dismissible) and the app
 * page (dismissible, persisted to localStorage).
 */
export default function SystemBanner({
  dismissible = false,
}: SystemBannerProps) {
  // A non-dismissible banner is always shown. A dismissible one starts hidden
  // until the effect confirms it wasn't previously closed, which avoids a flash
  // of the banner on reload for users who already dismissed it.
  const [visible, setVisible] = useState(!dismissible);

  useEffect(() => {
    if (!dismissible) return;
    setVisible(localStorage.getItem(SYSTEM_BANNER_STORAGE_KEY) !== "true");
  }, [dismissible]);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(SYSTEM_BANNER_STORAGE_KEY, "true");
    setVisible(false);
    // Let the preview disclaimer this banner supersedes know it can take over.
    window.dispatchEvent(new Event(SYSTEM_BANNER_DISMISSED_EVENT));
  };

  return (
    <Box
      as="aside"
      aria-label="Announcement"
      w="full"
      bg="lime.100"
      border="1px solid"
      borderColor="lime.400"
      px={4}
      py={2}
      fontFamily="body"
    >
      <Flex align="flex-start" justify="space-between" gap={2}>
        <Flex align="flex-start" gap={1} flex="1" minW={0}>
          <Box p="2px" lineHeight={0} flexShrink={0}>
            <Icon color="lime.700" asChild>
              <TreeIcon weight="fill" size={16} />
            </Icon>
          </Box>
          <Box pr={2} flex="1" minW={0}>
            <Text {...lineTextStyle} fontWeight="semibold">
              {SYSTEM_BANNER_HEADING}
            </Text>
            <Text {...lineTextStyle} mt="2px">
              {SYSTEM_BANNER_BODY}{" "}
              <Link
                href={SYSTEM_BANNER_LINK_URL}
                target="_blank"
                rel="noopener noreferrer"
                color="fg.link"
                textDecoration="underline"
                display="inline-flex"
                alignItems="center"
                verticalAlign="text-bottom"
                gap={1}
                whiteSpace="nowrap"
              >
                {SYSTEM_BANNER_LINK_LABEL}
                <Icon asChild boxSize="14px">
                  <ArrowSquareOutIcon />
                </Icon>
              </Link>
            </Text>
            {/* Divider separating the rebrand announcement from the Horizon
                preview disclaimer (Figma "System message" Line 94). */}
            <Box w="full" h="1px" bg="lime.400" mt={2} />
            <Text {...lineTextStyle} mt={2}>
              {SYSTEM_BANNER_PREVIEW_NOTE}
            </Text>
          </Box>
        </Flex>
        {dismissible && (
          <CloseButton
            size="2xs"
            flexShrink={0}
            onClick={dismiss}
            aria-label="Dismiss announcement"
          />
        )}
      </Flex>
    </Box>
  );
}
