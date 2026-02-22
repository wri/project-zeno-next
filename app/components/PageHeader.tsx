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
import { useTranslations } from "next-intl";

import useAuthStore from "../store/authStore";
import Link from "next/link";
import { toaster } from "@/app/components/ui/toaster";
import LanguageSelector from "./LanguageSelector";

function PageHeader() {
  const t = useTranslations("common");
  const { userEmail, usedPrompts, totalPrompts, isAuthenticated } =
    useAuthStore();
  const handleLogout = async () => {
    try {
      toaster.create({
        title: t("auth.loggingOut"),
        description: t("auth.loggingOutDescription"),
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
            {t("appName")}
          </Heading>
        </ChakraLink>
        <Badge
          colorPalette="primary"
          bg="primary.800"
          letterSpacing="wider"
          variant="solid"
          size="xs"
        >
          {t("preview")}
        </Badge>
      </Flex>
      <Flex gap="1" alignItems="center" hideBelow="md">
        <LanguageSelector />
        <Link href="https://help.globalnaturewatch.org/" target="_blank">
          <Button
            variant="solid"
            colorPalette="primary"
            _hover={{ bg: "primary.fg" }}
            size="sm"
          >
            <LifebuoyIcon />
            {t("buttons.help")}
          </Button>
        </Link>

        <Progress.Root
          size="xs"
          min={0}
          max={100}
          value={(usedPrompts / totalPrompts) * 100}
          minW="6rem"
          px="4"
          py="1.5"
          textAlign="center"
          rounded="full"
          colorPalette="primary"
        >
          <Progress.Label
            mb="0.5"
            fontSize="xs"
            fontWeight="normal"
            color="primary.100"
          >
            {usedPrompts}/
            {totalPrompts > 5000 ? (
              <Text as="span" fontSize="xl" verticalAlign="bottom">
                ∞
              </Text>
            ) : (
              totalPrompts
            )}{" "}
            {t("header.dailyPrompts")}
            <Tooltip
              content={
                totalPrompts > 5000
                  ? t("header.unlimitedPrompts")
                  : t("header.promptsUsageTooltip", {
                      used: usedPrompts,
                      total: totalPrompts,
                    })
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
          <Progress.Track bg="primary.950" maxH="4px">
            <Progress.Range bg="white" />
          </Progress.Track>
        </Progress.Root>
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
                {userEmail || t("header.userName")}
              </Button>
            </Menu.Trigger>
            <Portal>
              <Menu.Positioner>
                <Menu.Content css={{ "& a": { cursor: "pointer" } }}>
                  <Menu.Item value="dashboard" asChild>
                    <Link href="/dashboard">
                      <GearSixIcon />
                      {t("header.settings")}
                    </Link>
                  </Menu.Item>
                  <Menu.Separator />
                  <Menu.Item
                    value="logout"
                    cursor="pointer"
                    color="fg.error"
                    _hover={{ bg: "bg.error", color: "fg.error" }}
                    onClick={handleLogout}
                    title={t("header.logout")}
                  >
                    <SignOutIcon />
                    {t("header.logout")}
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
              {t("header.loginSignup")}
            </Link>
          </Button>
        )}
      </Flex>
    </Flex>
  );
}

export default PageHeader;
