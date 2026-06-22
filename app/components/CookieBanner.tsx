"use client";

import { useEffect } from "react";
import { Box, Button, Flex, Icon, Link, Text } from "@chakra-ui/react";
import { CookieIcon, XIcon } from "@phosphor-icons/react";
import useCookieStore from "@/app/store/cookieStore";
import { URLS } from "@/app/constants/urls";

export default function CookieBanner() {
  const { consentStatus, hydrate, acceptAll, rejectNonEssential } =
    useCookieStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (consentStatus !== "pending") return null;

  return (
    <Box
      position="fixed"
      bottom={4}
      right={4}
      zIndex={1200}
      bg="white"
      border="1px solid"
      borderColor="neutral.300"
      rounded="lg"
      p={4}
      w="332px"
      boxShadow="0 24px 40px rgba(24, 24, 27, 0.16)"
      _dark={{ bg: "neutral.800", borderColor: "neutral.700" }}
    >
      <Flex gap={3} align="flex-start">
        {/* Cookie icon */}
        <Box
          flexShrink={0}
          bg="primary.100"
          rounded="md"
          p="6px"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Icon color="primary.500" asChild>
            <CookieIcon size={20} />
          </Icon>
        </Box>

        {/* Text + buttons share the same column — guarantees left-alignment */}
        <Flex direction="column" gap={3} flex={1}>
          <Text
            fontSize="12px"
            lineHeight="19.5px"
            color="neutral.500"
            fontWeight="400"
          >
            We use cookies for analytics and to improve your experience.{" "}
            <Link
              href={URLS.privacyPolicy}
              target="_blank"
              rel="noopener noreferrer"
              textDecoration="underline"
              color="fg.link"
            >
              Privacy Notice
            </Link>
          </Text>

          <Flex gap={2}>
            <Button
              size="xs"
              bg="#0049A8"
              color="white"
              borderRadius="4px"
              fontWeight="normal"
              lineHeight="1.4"
              letterSpacing="0.0076em"
              onClick={acceptAll}
            >
              Accept All
            </Button>
            <Button
              size="xs"
              variant="outline"
              borderRadius="4px"
              fontWeight="normal"
              lineHeight="1.4"
              letterSpacing="0.0076em"
              onClick={rejectNonEssential}
            >
              Reject Non-Essential
            </Button>
          </Flex>
        </Flex>

        {/* Dismiss */}
        <Box
          as="button"
          flexShrink={0}
          onClick={rejectNonEssential}
          color="fg.muted"
          cursor="pointer"
          bg="transparent"
          border="none"
          p={0}
          display="flex"
          alignItems="center"
        >
          <XIcon size={14} />
        </Box>
      </Flex>
    </Box>
  );
}
