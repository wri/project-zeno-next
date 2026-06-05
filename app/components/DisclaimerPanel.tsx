"use client";

import { useState, useEffect } from "react";
import { Box, CloseButton, Flex, Icon, Link, Text } from "@chakra-ui/react";
import { InfoIcon } from "@phosphor-icons/react";
import {
  PREVIEW_BODY,
  PREVIEW_FEEDBACK_EMAIL,
  PREVIEW_HELP_CENTER_URL,
  PREVIEW_LINKS,
} from "@/app/constants/preview-content";

const STORAGE_KEY = "gnw_disclaimer_dismissed_v2";

export default function DisclaimerPanel() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) {
      setVisible(true);
    }
  }, []);

  // Notify the compact chat panel once we're actually rendered so it can
  // reserve the space below this banner and avoid overlapping it.
  useEffect(() => {
    if (visible) {
      window.dispatchEvent(new Event("gnw-disclaimer-shown"));
    }
  }, [visible]);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setVisible(false);
    window.dispatchEvent(new Event("gnw-disclaimer-dismissed"));
  };

  return (
    <Box
      id="gnw-disclaimer-panel"
      px={2}
      pt={2}
      pb={3}
      bg="lime.100"
      border="1px solid"
      borderColor="lime.400"
      rounded="sm"
      fontSize="xs"
      fontFamily="body"
    >
      <Flex gap={2} align="flex-start">
        <Icon color="lime.700" flexShrink={0} mt="2px" asChild>
          <InfoIcon weight="fill" size={16} />
        </Icon>
        <Box flex="1" pr={5}>
          <Text mb={1}>{PREVIEW_BODY}</Text>
          <Text>
            Feedback is welcome at{" "}
            <Link
              color="fg.link"
              textDecoration="underline"
              href={`mailto:${PREVIEW_FEEDBACK_EMAIL}`}
            >
              {PREVIEW_FEEDBACK_EMAIL}.
            </Link>{" "}
            <br />
            Visit the{" "}
            <Link
              color="fg.link"
              textDecoration="underline"
              href={PREVIEW_HELP_CENTER_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Help Center
            </Link>{" "}
            to learn more about the preview.
          </Text>

          <Flex
            mt={4}
            gap={3}
            flexWrap="wrap"
            fontSize="xs"
            fontFamily="heading"
          >
            {PREVIEW_LINKS.map((link) => (
              <Link
                key={link.label}
                color="fg.link"
                textDecoration="underline"
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                {link.label}
              </Link>
            ))}
          </Flex>
        </Box>
        <CloseButton
          size="2xs"
          position="absolute"
          top={2}
          right={2}
          onClick={dismiss}
          aria-label="Dismiss disclaimer"
        />
      </Flex>
    </Box>
  );
}
