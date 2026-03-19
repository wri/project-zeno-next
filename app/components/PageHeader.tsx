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

import useAuthStore from "../store/authStore";
import Link from "next/link";
import { toaster } from "@/app/components/ui/toaster";

const isPrototype = process.env.NEXT_PUBLIC_PROTOTYPE_MODE === "true";

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
