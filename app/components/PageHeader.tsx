"use client";

import {
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
import LclLogo from "./LclLogo";
import {
  CaretDownIcon,
  ClockCounterClockwiseIcon,
  GearSixIcon,
  LifebuoyIcon,
  PlusIcon,
  SignOutIcon,
  UserIcon,
  InfoIcon,
} from "@phosphor-icons/react";
import { Tooltip } from "./ui/tooltip";

import useAuthStore from "../store/authStore";
import useChatStore from "../store/chatStore";
import useSidebarStore from "../store/sidebarStore";
import ThreadActionsMenu from "./ThreadActionsMenu";
import Link from "next/link";
import { useLogout } from "@/app/hooks/useLogout";

const isPrototype = process.env.NEXT_PUBLIC_PROTOTYPE_MODE === "true";

function PageHeader() {
  const { userEmail, usedPrompts, totalPrompts, isAuthenticated } =
    useAuthStore();
  const { toggleSidebar, getThreadById } = useSidebarStore();
  const { currentThreadId } = useChatStore();
  const { logout } = useLogout();

  const currentThread = currentThreadId
    ? getThreadById(currentThreadId)
    : undefined;
  const currentThreadName = currentThread
    ? currentThread.name
    : "New Conversation";

  const inverseColor = isPrototype ? "#1f2937" : "fg.inverted";
  const inverseHoverBg = isPrototype ? "#6b7280" : "primary.fg";
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
      <Flex gap="5" alignItems="center" minW={0}>
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
            <Heading as="h1" size="sm" color={inverseColor}>
              Global Nature Watch
            </Heading>
          </ChakraLink>
          <Badge
            colorPalette={isPrototype ? "gray" : "primary"}
            bg={isPrototype ? "#1f2937" : "primary.800"}
            color={isPrototype ? "#f3f4f6" : undefined}
            letterSpacing="wider"
            variant="solid"
            size="xs"
          >
            {isPrototype ? "PROTOTYPE" : "PREVIEW"}
          </Badge>
        </Flex>
        <Flex gap="1" alignItems="center" hideBelow="md" minW={0}>
          <Tooltip content="Conversation history" showArrow>
            <IconButton
              size="sm"
              variant="ghost"
              color={inverseColor}
              _hover={{ bg: inverseHoverBg }}
              onClick={toggleSidebar}
              aria-label="Toggle conversation history"
            >
              <ClockCounterClockwiseIcon />
            </IconButton>
          </Tooltip>
          {currentThreadId && currentThread ? (
            <ThreadActionsMenu thread={currentThread}>
              <Button
                variant="ghost"
                size="sm"
                color={inverseColor}
                _hover={{ bg: inverseHoverBg }}
                px={2}
                minW={0}
                maxW="280px"
                justifyContent="flex-start"
                fontWeight="normal"
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
                <CaretDownIcon />
              </Button>
            </ThreadActionsMenu>
          ) : (
            <Text
              fontSize="sm"
              color={inverseColor}
              opacity={0.8}
              px={2}
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
              size="sm"
              variant="ghost"
              color={inverseColor}
              _hover={{ bg: inverseHoverBg }}
            >
              <Link href="/app" aria-label="New conversation">
                <PlusIcon />
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
