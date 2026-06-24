"use client";

import Link from "next/link";
import {
  Flex,
  Heading,
  Text,
  Badge,
  Progress,
  Link as ChakraLink,
} from "@chakra-ui/react";
import { LifebuoyIcon, UserIcon } from "@phosphor-icons/react";
import LclLogo from "@/app/components/LclLogo";
import { Tooltip } from "@/app/components/ui/tooltip";
import useAuthStore from "@/app/store/authStore";

// Matches the design's "GlobalHeader - Phase 2": logo + PREVIEW, centered
// Map / Dashboards segmented tabs, and a slim right cluster (Help, prompt
// slider, user). Scoped to the dashboards prototype so the production
// PageHeader is left untouched.

const NAVY = "#131E47";
const MUTED = "#656E7B";

function Tab({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active?: boolean;
}) {
  return (
    <ChakraLink
      as={Link}
      {...{ href }}
      px="8px"
      py="4px"
      rounded="4px"
      fontSize="14px"
      lineHeight="20px"
      fontWeight="600"
      bg={active ? "#0049AA" : "transparent"}
      color={active ? "#FFFFFF" : "#4A64CB"}
      _hover={active ? { bg: "#0049AA" } : { bg: "whiteAlpha.600" }}
      transition="background 0.15s ease"
    >
      {label}
    </ChakraLink>
  );
}

export default function DashboardHeader() {
  const { userEmail, usedPrompts, totalPrompts } = useAuthStore();
  // Fall back to the design's sample values when no session is loaded.
  const used = totalPrompts > 0 ? usedPrompts : 40;
  const total = totalPrompts > 0 ? totalPrompts : 100;

  return (
    <Flex
      align="center"
      justify="space-between"
      gap="4"
      px="3"
      h="44px"
      bg="white"
      color={NAVY}
      borderTop="4px solid #E3F37F"
      position="relative"
      zIndex={1300}
      flexShrink={0}
    >
      {/* Left: logo + PREVIEW */}
      <Flex gap="2" align="center" minW={0}>
        <ChakraLink
          as={Link}
          {...{ href: "/" }}
          display="flex"
          alignItems="center"
          gap="1"
          _hover={{ opacity: 0.8 }}
        >
          <LclLogo width={16} avatarOnly fill={NAVY} />
          <Heading
            as="h1"
            fontSize="13px"
            fontWeight="500"
            lineHeight="20px"
            color={NAVY}
            whiteSpace="nowrap"
          >
            Global Nature Watch
          </Heading>
        </ChakraLink>
        <Badge
          bg="#E0E2E5"
          color="#3A4048"
          fontSize="10px"
          fontWeight="500"
          px="4px"
          py="2px"
          rounded="4px"
        >
          BETA
        </Badge>
      </Flex>

      {/* Center: Map / Dashboards tabs */}
      <Flex
        position="absolute"
        left="50%"
        transform="translateX(-50%)"
        gap="4px"
        p="4px"
        bg="#F0F4FF"
        borderWidth="1px"
        borderColor="#F0F4FF"
        rounded="8px"
        hideBelow="md"
      >
        <Tab href="/app" label="Map" />
        <Tab href="/dashboards" label="Dashboards" active />
      </Flex>

      {/* Right: Help, prompts, user */}
      <Flex gap="5" align="center" hideBelow="md">
        <ChakraLink
          as={Link}
          {...{ href: "https://help.globalnaturewatch.org/", target: "_blank" }}
          display="flex"
          alignItems="center"
          gap="2"
          color={MUTED}
          fontSize="xs"
          fontWeight="medium"
          _hover={{ opacity: 0.8 }}
        >
          <LifebuoyIcon size={16} />
          Help
        </ChakraLink>

        <Progress.Root
          size="xs"
          min={0}
          max={100}
          value={total > 0 ? (used / total) * 100 : 0}
          minW="100px"
          colorPalette="primary"
        >
          <Progress.Label
            mb="0.5"
            fontSize="xs"
            fontWeight="normal"
            whiteSpace="nowrap"
            color={MUTED}
          >
            {used} / {total} prompts
          </Progress.Label>
          <Progress.Track bg="#E0E2E5" maxH="4px">
            <Progress.Range bg="#0049AA" />
          </Progress.Track>
        </Progress.Root>

        <Tooltip content="Account (prototype)" showArrow>
          <Flex
            align="center"
            gap="2"
            color={MUTED}
            fontSize="xs"
            fontWeight="medium"
          >
            <UserIcon size={16} />
            <Text truncate maxW="160px">
              {userEmail || "User name"}
            </Text>
          </Flex>
        </Tooltip>
      </Flex>
    </Flex>
  );
}
