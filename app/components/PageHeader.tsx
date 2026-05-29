"use client";

import {
  Box,
  Flex,
  Heading,
  Button,
  Progress,
  Badge,
  Menu,
  Portal,
  Link as ChakraLink,
  Text,
} from "@chakra-ui/react";
import LclLogo from "./LclLogo";
import {
  GearSixIcon,
  LifebuoyIcon,
  SignOutIcon,
  UserIcon,
  InfoIcon,
} from "@phosphor-icons/react";
import { Tooltip } from "./ui/tooltip";
import { useState, useEffect, useRef } from "react";
import PreviewInfoPanel from "./PreviewInfoPanel";

import useAuthStore from "../store/authStore";
import Link from "next/link";
import { useLogout } from "@/app/hooks/useLogout";

const isPrototype = process.env.NEXT_PUBLIC_PROTOTYPE_MODE === "true";
const DISCLAIMER_STORAGE_KEY = "gnw_disclaimer_dismissed_v2";

function PageHeader() {
  const { userEmail, usedPrompts, totalPrompts, isAuthenticated } =
    useAuthStore();
  const { logout } = useLogout();
  const [disclaimerDismissed, setDisclaimerDismissed] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const badgeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dismissed = localStorage.getItem(DISCLAIMER_STORAGE_KEY) === "true";
    setDisclaimerDismissed(dismissed);

    const handleDismiss = () => setDisclaimerDismissed(true);
    window.addEventListener("gnw-disclaimer-dismissed", handleDismiss);
    return () =>
      window.removeEventListener("gnw-disclaimer-dismissed", handleDismiss);
  }, []);

  useEffect(() => {
    if (!panelOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (badgeRef.current && !badgeRef.current.contains(e.target as Node)) {
        setPanelOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [panelOpen]);

  return (
    <Flex
      alignItems="center"
      justifyContent="space-between"
      px={{ base: 3, md: 5 }}
      py="2"
      h={{ base: 10, md: 12 }}
      bg={isPrototype ? "#d1d5db" : "primary.solid"}
      color={isPrototype ? "#1f2937" : "fg.inverted"}
      zIndex={1300}
      position="relative"
    >
      <Flex gap="2" alignItems="center">
        <ChakraLink
          as={Link}
          href="/"
          display="flex"
          transition="opacity 0.24s ease"
          _hover={{ opacity: 0.8 }}
        >
          <LclLogo
            width={16}
            avatarOnly
            fill={isPrototype ? "#1f2937" : "white"}
          />
          <Heading
            as="h1"
            size="sm"
            color={isPrototype ? "#1f2937" : "fg.inverted"}
          >
            Global Nature Watch
          </Heading>
        </ChakraLink>
        {isPrototype ? (
          <Badge
            colorPalette="gray"
            bg="#1f2937"
            color="#f3f4f6"
            letterSpacing="wider"
            variant="solid"
            size="xs"
          >
            PROTOTYPE
          </Badge>
        ) : (
          <Box position="relative" ref={badgeRef}>
            <Flex
              as={disclaimerDismissed ? "button" : "span"}
              align="center"
              gap="4px"
              h="20px"
              px="4px"
              py="2px"
              borderRadius="4px"
              bg="#E0E2E5"
              border="none"
              cursor={disclaimerDismissed ? "pointer" : "default"}
              onClick={
                disclaimerDismissed ? () => setPanelOpen(!panelOpen) : undefined
              }
              aria-label={disclaimerDismissed ? "Open preview info" : undefined}
            >
              <Text
                fontFamily="sans-serif"
                fontWeight="medium"
                fontSize="10px"
                lineHeight="16px"
                color="#3A4048"
                letterSpacing="0"
              >
                PREVIEW
              </Text>
              {disclaimerDismissed && (
                <InfoIcon size={13} color="#3A4048" weight="fill" />
              )}
            </Flex>
            {panelOpen && (
              <PreviewInfoPanel onClose={() => setPanelOpen(false)} />
            )}
          </Box>
        )}
      </Flex>
      {isPrototype && (
        <Text
          fontSize="xs"
          fontWeight="bold"
          letterSpacing="wider"
          textTransform="uppercase"
          color="#1f2937"
          position="absolute"
          left="50%"
          transform="translateX(-50%)"
          pointerEvents="none"
        >
          NOT FOR PRODUCTION USE
        </Text>
      )}
      <Flex gap="6" alignItems="center" hideBelow="md">
        <Link href="https://help.globalnaturewatch.org/" target="_blank">
          <Button
            variant="solid"
            colorPalette={isPrototype ? "gray" : "primary"}
            bg={isPrototype ? "#9ca3af" : undefined}
            color={isPrototype ? "#1f2937" : undefined}
            _hover={{ bg: isPrototype ? "#6b7280" : "primary.fg" }}
            size="sm"
          >
            <LifebuoyIcon />
            Help
          </Button>
        </Link>

        <Progress.Root
          size="xs"
          min={0}
          max={100}
          value={(usedPrompts / totalPrompts) * 100}
          minW="6rem"
          textAlign="center"
          rounded="full"
          colorPalette="primary"
        >
          <Progress.Label
            mb="0.5"
            fontSize="xs"
            fontWeight="normal"
            color={isPrototype ? "#6b7280" : "primary.100"}
          >
            {usedPrompts}/
            {totalPrompts > 5000 ? (
              <Text as="span" fontSize="xl" verticalAlign="bottom">
                ∞
              </Text>
            ) : (
              totalPrompts
            )}{" "}
            daily prompts
            <Tooltip
              content={
                totalPrompts > 5000
                  ? "You have unlimited prompts!"
                  : `${usedPrompts} of ${totalPrompts} prompts used. Prompts refresh every 24 hours.`
              }
              showArrow
            >
              <Text
                as="span"
                display="inline-block"
                ml="1"
                verticalAlign="text-bottom"
                cursor="help"
              >
                <InfoIcon />
              </Text>
            </Tooltip>
          </Progress.Label>
          <Progress.Track
            bg={isPrototype ? "#6b7280" : "primary.950"}
            maxH="4px"
          >
            <Progress.Range bg={isPrototype ? "#1f2937" : "white"} />
          </Progress.Track>
        </Progress.Root>
        {isAuthenticated ? (
          <Menu.Root positioning={{ placement: "bottom-end" }}>
            <Menu.Trigger asChild>
              <Button
                variant="solid"
                colorPalette={isPrototype ? "gray" : "primary"}
                bg={isPrototype ? "#9ca3af" : undefined}
                color={isPrototype ? "#1f2937" : undefined}
                _hover={{ bg: isPrototype ? "#6b7280" : "primary.fg" }}
                size="sm"
              >
                <UserIcon />
                <Text truncate maxW="180px">
                  {userEmail || "User name"}
                </Text>
              </Button>
            </Menu.Trigger>
            <Portal>
              <Menu.Positioner>
                <Menu.Content css={{ "& a": { cursor: "pointer" } }}>
                  <Menu.Item value="dashboard" asChild>
                    <Link href="/dashboard">
                      <GearSixIcon />
                      Settings
                    </Link>
                  </Menu.Item>
                  <Menu.Separator />
                  <Menu.Item
                    value="logout"
                    cursor="pointer"
                    color="fg.error"
                    _hover={{ bg: "bg.error", color: "fg.error" }}
                    onClick={logout}
                    title="Log Out"
                  >
                    <SignOutIcon />
                    Logout
                  </Menu.Item>
                </Menu.Content>
              </Menu.Positioner>
            </Portal>
          </Menu.Root>
        ) : (
          <Button
            asChild
            variant="solid"
            colorPalette={isPrototype ? "gray" : "primary"}
            bg={isPrototype ? "#9ca3af" : undefined}
            color={isPrototype ? "#1f2937" : undefined}
            _hover={{ bg: isPrototype ? "#6b7280" : "primary.fg" }}
            size="sm"
          >
            <Link href="/app">
              <UserIcon />
              Log in / Sign Up
            </Link>
          </Button>
        )}
      </Flex>
    </Flex>
  );
}

export default PageHeader;
