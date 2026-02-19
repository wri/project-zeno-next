"use client";

import {
  Flex,
  Heading,
  Progress,
  Badge,
  Menu,
  Portal,
  Link as ChakraLink,
  Text,
  IconButton,
} from "@chakra-ui/react";
import LclLogo from "./LclLogo";
import {
  DotsThreeIcon,
  GearSixIcon,
  LifebuoyIcon,
  SignOutIcon,
  UserIcon,
  InfoIcon,
} from "@phosphor-icons/react";
import { Tooltip } from "./ui/tooltip";

import useAuthStore from "../store/authStore";
import Link from "next/link";
import { toaster } from "@/app/components/ui/toaster";

function PageHeader() {
  const { userEmail, usedPrompts, totalPrompts, isAuthenticated } =
    useAuthStore();

  const handleLogout = async () => {
    try {
      toaster.create({
        title: "Logging out",
        description: "Signing you out and redirecting…",
        type: "info",
        duration: 8000,
      });
    } catch {}
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    const url = new URL("https://api.resourcewatch.org/auth/logout");
    url.searchParams.set("callbackUrl", `${window.location.origin}/`);
    url.searchParams.set("origin", "gnw");
    window.location.href = url.toString();
  };

  return (
    <Flex
      alignItems="center"
      justifyContent="space-between"
      px={3}
      py="1.5"
      h="auto"
      bg="primary.solid"
      color="fg.inverted"
      rounded="md"
      shadow="md"
      w="100%"
    >
      {/* Logo */}
      <Flex gap="2" alignItems="center" minW={0}>
        <ChakraLink
          as={Link}
          href="/"
          display="flex"
          alignItems="center"
          gap={1}
          transition="opacity 0.24s ease"
          _hover={{ opacity: 0.8 }}
          flexShrink={0}
        >
          <LclLogo width={14} avatarOnly fill="white" />
          <Heading as="h1" size="xs" color="fg.inverted" whiteSpace="nowrap">
            Global Nature Watch
          </Heading>
        </ChakraLink>
        <Badge
          colorPalette="primary"
          bg="primary.800"
          letterSpacing="wider"
          variant="solid"
          size="xs"
          flexShrink={0}
        >
          PREVIEW
        </Badge>
      </Flex>

      {/* Overflow menu — Help, prompts, login */}
      <Menu.Root positioning={{ placement: "bottom-end" }}>
        <Menu.Trigger asChild>
          <IconButton
            size="xs"
            variant="ghost"
            color="fg.inverted"
            _hover={{ bg: "primary.700" }}
            aria-label="More options"
            flexShrink={0}
          >
            <DotsThreeIcon weight="bold" />
          </IconButton>
        </Menu.Trigger>
        <Portal>
          <Menu.Positioner>
            <Menu.Content minW="220px" css={{ "& a": { cursor: "pointer" } }}>
              {/* Prompt quota */}
              <Flex px={3} py={2} flexDir="column" gap={1}>
                <Progress.Root
                  size="xs"
                  min={0}
                  max={100}
                  value={(usedPrompts / totalPrompts) * 100}
                  rounded="full"
                  colorPalette="primary"
                >
                  <Progress.Label
                    mb="0.5"
                    fontSize="xs"
                    fontWeight="normal"
                    color="fg.muted"
                  >
                    {usedPrompts}/
                    {totalPrompts > 5000 ? (
                      <Text as="span" fontSize="lg" verticalAlign="bottom">
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
                  <Progress.Track maxH="4px">
                    <Progress.Range />
                  </Progress.Track>
                </Progress.Root>
              </Flex>

              <Menu.Separator />

              {/* Help */}
              <Menu.Item value="help" asChild>
                <Link
                  href="https://help.globalnaturewatch.org/"
                  target="_blank"
                >
                  <LifebuoyIcon />
                  Help
                </Link>
              </Menu.Item>

              <Menu.Separator />

              {/* Auth */}
              {isAuthenticated ? (
                <>
                  <Flex px={3} py={1.5}>
                    <Text fontSize="xs" color="fg.muted" truncate>
                      {userEmail}
                    </Text>
                  </Flex>
                  <Menu.Item value="dashboard" asChild>
                    <Link href="/dashboard">
                      <GearSixIcon />
                      Settings
                    </Link>
                  </Menu.Item>
                  <Menu.Item
                    value="logout"
                    cursor="pointer"
                    color="fg.error"
                    _hover={{ bg: "bg.error", color: "fg.error" }}
                    onClick={handleLogout}
                  >
                    <SignOutIcon />
                    Logout
                  </Menu.Item>
                </>
              ) : (
                <Menu.Item value="login" asChild>
                  <Link href="/app">
                    <UserIcon />
                    Log in / Sign Up
                  </Link>
                </Menu.Item>
              )}
            </Menu.Content>
          </Menu.Positioner>
        </Portal>
      </Menu.Root>
    </Flex>
  );
}

export default PageHeader;
