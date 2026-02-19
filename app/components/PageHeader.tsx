"use client";

import {
  Flex,
  Heading,
  Button,
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

const isFloating = process.env.NEXT_PUBLIC_FLOATING_HEADER === "true";

function PageHeader() {
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

  if (isFloating) {
    return <FloatingHeader handleLogout={handleLogout} />;
  }
  return <FullHeader handleLogout={handleLogout} />;
}

/* ─── Floating compact header (for map overlay) ─── */
function FloatingHeader({ handleLogout }: { handleLogout: () => void }) {

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
          PROTOTYPE
        </Badge>
      </Flex>

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
              <Flex px={3} py={2} flexDir="column" gap={1}>
                <PromptQuota />
              </Flex>
              <Menu.Separator />
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
              <AuthMenuItems
                handleLogout={handleLogout}
              />
            </Menu.Content>
          </Menu.Positioner>
        </Portal>
      </Menu.Root>
    </Flex>
  );
}

/* ─── Original full-width header ─── */
function FullHeader({ handleLogout }: { handleLogout: () => void }) {
  const { userEmail, isAuthenticated } = useAuthStore();

  return (
    <Flex
      alignItems="center"
      justifyContent="space-between"
      px={{ base: 3, md: 5 }}
      py="2"
      h={{ base: 10, md: 12 }}
      bg="primary.solid"
      color="fg.inverted"
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
          <LclLogo width={16} avatarOnly fill="white" />
          <Heading as="h1" size="sm" color="fg.inverted">
            Global Nature Watch
          </Heading>
        </ChakraLink>
        <Badge
          colorPalette="primary"
          bg="primary.800"
          letterSpacing="wider"
          variant="solid"
          size="xs"
        >
          PROTOTYPE
        </Badge>
      </Flex>
      <Flex gap="6" alignItems="center" hideBelow="md">
        <Link href="https://help.globalnaturewatch.org/" target="_blank">
          <Button
            variant="solid"
            colorPalette="primary"
            _hover={{ bg: "primary.fg" }}
            size="sm"
          >
            <LifebuoyIcon />
            Help
          </Button>
        </Link>

        <PromptQuota />

        {isAuthenticated ? (
          <Menu.Root positioning={{ placement: "bottom-end" }}>
            <Menu.Trigger asChild>
              <Button
                variant="solid"
                colorPalette="primary"
                _hover={{ bg: "primary.fg" }}
                size="sm"
              >
                <UserIcon />
                {userEmail || "User name"}
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
                    onClick={handleLogout}
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
            colorPalette="primary"
            _hover={{ bg: "primary.fg" }}
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

/* ─── Shared sub-components ─── */

function PromptQuota() {
  const { usedPrompts, totalPrompts } = useAuthStore();
  return (
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
        color={isFloating ? "fg.muted" : "primary.100"}
      >
        {usedPrompts}/
        {totalPrompts > 5000 ? (
          <Text as="span" fontSize={isFloating ? "lg" : "xl"} verticalAlign="bottom">
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
      <Progress.Track bg={isFloating ? undefined : "primary.950"} maxH="4px">
        <Progress.Range bg={isFloating ? undefined : "white"} />
      </Progress.Track>
    </Progress.Root>
  );
}

function AuthMenuItems({ handleLogout }: { handleLogout: () => void }) {
  const { userEmail, isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return (
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
    );
  }

  return (
    <Menu.Item value="login" asChild>
      <Link href="/app">
        <UserIcon />
        Log in / Sign Up
      </Link>
    </Menu.Item>
  );
}

export default PageHeader;
