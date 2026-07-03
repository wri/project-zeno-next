"use client";

import {
  Box,
  Flex,
  Heading,
  Button,
  IconButton,
  Progress,
  Badge,
  Menu,
  Portal,
  Link as ChakraLink,
  Text,
} from "@chakra-ui/react";
import {
  CaretDownIcon,
  ClockCounterClockwiseIcon,
  GearSixIcon,
  LifebuoyIcon,
  PlusIcon,
  ShootingStarIcon,
  SignOutIcon,
  UserIcon,
  InfoIcon,
} from "@phosphor-icons/react";
import { Tooltip } from "./ui/tooltip";
import { useState, useEffect, useRef } from "react";
import PreviewInfoPanel from "./PreviewInfoPanel";

import useAuthStore from "../store/authStore";
import useChatStore from "../store/chatStore";
import useSidebarStore from "../store/sidebarStore";
import ThreadActionsMenu from "./ThreadActionsMenu";
import Link from "next/link";
import { useLogout } from "@/app/hooks/useLogout";
import { useThreadsInfinite } from "@/app/hooks/useThreadsInfinite";

const isPrototype = process.env.NEXT_PUBLIC_PROTOTYPE_MODE === "true";
const DISCLAIMER_STORAGE_KEY = "gnw_disclaimer_dismissed_v2";
const WHATS_NEW_STORAGE_KEY = "whats-new-v4-dismissed";

function PageHeader() {
  const { userEmail, usedPrompts, totalPrompts, isAuthenticated } =
    useAuthStore();
  const { toggleSidebar } = useSidebarStore();
  const { currentThreadId } = useChatStore();
  const { logout } = useLogout();
  const { threads } = useThreadsInfinite();

  const currentThread = currentThreadId
    ? threads.find((t) => t.id === currentThreadId)
    : undefined;
  const currentThreadName = currentThread
    ? currentThread.name
    : "New Conversation";

  const inverseColor = isPrototype ? "#1f2937" : "neutral.600";
  const inverseHoverBg = isPrototype ? "#6b7280" : "neutral.200";
  const focusRing = {
    outline: "2px solid",
    outlineColor: inverseColor,
    outlineOffset: "2px",
    borderRadius: "sm",
  };

  const [disclaimerDismissed, setDisclaimerDismissed] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [showWhatsNewDot, setShowWhatsNewDot] = useState(false);
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
    setShowWhatsNewDot(localStorage.getItem(WHATS_NEW_STORAGE_KEY) !== "true");
    const handleDismissed = () => setShowWhatsNewDot(false);
    window.addEventListener("gnw-whats-new-dismissed", handleDismissed);
    return () =>
      window.removeEventListener("gnw-whats-new-dismissed", handleDismissed);
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
      gap="4"
      px="3"
      h="40px"
      bg={isPrototype ? "#d1d5db" : "white"}
      color={isPrototype ? "#1f2937" : "#131E47"}
      borderTop={isPrototype ? undefined : "4px solid #E3F37F"}
      zIndex={1300}
      position="relative"
    >
      <Flex gap="5" alignItems="center" minW={0}>
        <Flex gap="2" alignItems="center">
          <ChakraLink
            as={Link}
            href="/"
            transition="opacity 0.24s ease"
            _hover={{ opacity: 0.8 }}
            _focusVisible={focusRing}
          >
            <Heading
              as="h1"
              size="sm"
              color={isPrototype ? "#1f2937" : "#131E47"}
            >
              Global Nature Watch{" "}
              <Text
                as="span"
                fontWeight="normal"
                color={isPrototype ? "#1f2937" : "neutral.600"}
              >
                Horizon
              </Text>
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
                  disclaimerDismissed
                    ? () => setPanelOpen(!panelOpen)
                    : undefined
                }
                aria-label={
                  disclaimerDismissed ? "Open preview info" : undefined
                }
              >
                <Text
                  fontFamily="'IBM Plex Sans', sans-serif"
                  fontStyle="normal"
                  fontWeight="500"
                  fontSize="10px"
                  lineHeight="16px"
                  color="#3A4048"
                  flexShrink={0}
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
        <Flex gap="1" alignItems="center" hideBelow="md" minW={0}>
          <Tooltip content="Conversation history" showArrow>
            <IconButton
              size="xs"
              variant="ghost"
              color={inverseColor}
              _hover={{ bg: inverseHoverBg }}
              _focusVisible={focusRing}
              onClick={toggleSidebar}
              aria-label="Toggle conversation history"
            >
              <ClockCounterClockwiseIcon size={16} />
            </IconButton>
          </Tooltip>
          {currentThread ? (
            <ThreadActionsMenu thread={currentThread}>
              <Button
                variant="ghost"
                size="xs"
                color={inverseColor}
                _hover={{ bg: inverseHoverBg }}
                _focusVisible={focusRing}
                px={0}
                minW={0}
                maxW="280px"
                justifyContent="flex-start"
                fontWeight="normal"
                fontSize="xs"
                gap="1"
              >
                <Tooltip content={currentThreadName} showArrow>
                  <Text
                    as="span"
                    flex="1"
                    minW={0}
                    whiteSpace="nowrap"
                    overflow="hidden"
                    textOverflow="ellipsis"
                  >
                    {currentThreadName}
                  </Text>
                </Tooltip>
                <CaretDownIcon size={12} />
              </Button>
            </ThreadActionsMenu>
          ) : (
            <Text
              fontSize="xs"
              color={inverseColor}
              opacity={0.8}
              px={0}
              maxW="240px"
              whiteSpace="nowrap"
              overflow="hidden"
              textOverflow="ellipsis"
            >
              {currentThreadName}
            </Text>
          )}
          <Tooltip content="New conversation" showArrow>
            <IconButton
              asChild
              size="xs"
              variant="ghost"
              color={inverseColor}
              _hover={{ bg: inverseHoverBg }}
              _focusVisible={focusRing}
            >
              <Link href="/app" aria-label="New conversation">
                <PlusIcon size={16} />
              </Link>
            </IconButton>
          </Tooltip>
        </Flex>
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
        <Button
          variant="ghost"
          size="xs"
          color={isPrototype ? "#1f2937" : "#656E7B"}
          fill={isPrototype ? "#1f2937" : "#F4F5F6"}
          _hover={{ bg: inverseHoverBg }}
          _focusVisible={focusRing}
          gap="2"
          fontWeight="medium"
          fontSize="xs"
          onClick={() => {
            localStorage.setItem(WHATS_NEW_STORAGE_KEY, "true");
            window.dispatchEvent(new CustomEvent("gnw-whats-new-dismissed"));
            window.dispatchEvent(new CustomEvent("gnw-whats-new-open"));
          }}
        >
          <ShootingStarIcon size={16} />
          {"What's new"}
          {showWhatsNewDot && (
            <Box
              w="8px"
              h="8px"
              borderRadius="8px"
              bg="#C3D16F"
              flexShrink={0}
            />
          )}
        </Button>
        <ChakraLink
          as={Link}
          href="https://help.globalnaturewatch.org/"
          target="_blank"
          display="flex"
          alignItems="center"
          gap="2"
          color={isPrototype ? "#1f2937" : "#656E7B"}
          fontSize="xs"
          fontWeight="medium"
          transition="opacity 0.24s ease"
          _hover={{ opacity: 0.8 }}
          _focusVisible={focusRing}
        >
          <LifebuoyIcon size={16} />
          Help
        </ChakraLink>

        <Progress.Root
          size="xs"
          min={0}
          max={100}
          value={totalPrompts > 0 ? (usedPrompts / totalPrompts) * 100 : 0}
          minW="100px"
          mt="1"
          mb="2"
          textAlign="center"
          rounded="full"
          colorPalette="primary"
        >
          <Progress.Label
            mb="0.5"
            fontSize="xs"
            lineHeight="1.5"
            fontWeight="normal"
            whiteSpace="nowrap"
            color={isPrototype ? "#6b7280" : "#656E7B"}
          >
            {usedPrompts} / {totalPrompts > 5000 ? "∞" : totalPrompts} daily
            prompts
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
                <InfoIcon size={12} />
              </Text>
            </Tooltip>
          </Progress.Label>
          <Progress.Track bg={isPrototype ? "#6b7280" : "#E0E2E5"} maxH="4px">
            <Progress.Range bg={isPrototype ? "#1f2937" : "#0049AA"} />
          </Progress.Track>
        </Progress.Root>
        {isAuthenticated ? (
          <Menu.Root positioning={{ placement: "bottom-end" }}>
            <Menu.Trigger asChild>
              <Button
                variant={isPrototype ? "solid" : "ghost"}
                colorPalette={isPrototype ? "gray" : undefined}
                bg={isPrototype ? "#9ca3af" : undefined}
                color={isPrototype ? "#1f2937" : "#656E7B"}
                _hover={{ bg: isPrototype ? "#6b7280" : "#F0F1F2" }}
                _focusVisible={focusRing}
                h="40px"
                px="2"
                gap="2"
                fontSize="xs"
                fontWeight="medium"
                rounded="sm"
              >
                <UserIcon size={16} />
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
          <ChakraLink
            as={Link}
            href="/app"
            display="flex"
            alignItems="center"
            gap="2"
            color={isPrototype ? "#1f2937" : "#656E7B"}
            fontSize="xs"
            fontWeight="medium"
            transition="opacity 0.24s ease"
            _hover={{ opacity: 0.8 }}
            _focusVisible={focusRing}
          >
            <UserIcon size={16} />
            Log in / Sign Up
          </ChakraLink>
        )}
      </Flex>
    </Flex>
  );
}

export default PageHeader;
