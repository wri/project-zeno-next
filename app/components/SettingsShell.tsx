"use client";
import { ReactNode } from "react";
import {
  Box,
  Button,
  ButtonGroup,
  Flex,
  Heading,
  Progress,
  Text,
  Link as ChakraLink,
} from "@chakra-ui/react";
import {
  GearIcon,
  LifebuoyIcon,
  MapTrifoldIcon,
  SignOutIcon,
  UserIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import LclLogo from "@/app/components/LclLogo";
import useAuthStore from "@/app/store/authStore";
import { useLogout } from "@/app/hooks/useLogout";

type SettingsPath = "/dashboard" | "/manage-users";

interface SettingsShellProps {
  activePath: SettingsPath;
  children: ReactNode;
}

export default function SettingsShell({
  activePath,
  children,
}: SettingsShellProps) {
  const { userEmail, userType, usedPrompts, totalPrompts } = useAuthStore();
  const { logout } = useLogout();

  return (
    <Box
      display="grid"
      gridTemplateColumns="20rem 1fr"
      height="100vh"
      maxH="100vh"
    >
      <Flex flexDir="column" bg="bg.subtle" px={6} py={8} maxH="100%" gap={6}>
        <ChakraLink
          as={Link}
          href="/"
          display="flex"
          alignItems="center"
          gap="2"
          transition="opacity 0.24s ease"
          _hover={{ opacity: 0.8, textDecor: "none" }}
        >
          <LclLogo width={16} avatarOnly />
          <Heading m={0}>Global Nature Watch</Heading>
        </ChakraLink>
        <ButtonGroup
          size="sm"
          w="full"
          gap={2}
          variant="outline"
          _hover={{ "& > :not(:hover)": { opacity: "0.5" } }}
          css={{ "& > *": { justifyContent: "flex-start", width: "100%" } }}
          colorPalette="gray"
          orientation="vertical"
          alignItems="stretch"
        >
          <Button
            asChild
            bg={activePath === "/dashboard" ? "white" : undefined}
          >
            <Link href="/dashboard">
              <GearIcon />
              User Settings
            </Link>
          </Button>
          {userType === "superuser" && (
            <Button
              asChild
              bg={activePath === "/manage-users" ? "white" : undefined}
            >
              <Link href="/manage-users">
                <UsersThreeIcon />
                Manage Users
              </Link>
            </Button>
          )}
          <Button asChild>
            <Link href="https://help.globalnaturewatch.org/" target="_blank">
              <LifebuoyIcon />
              Help
            </Link>
          </Button>
          <Button asChild>
            <Link href="/app">
              <MapTrifoldIcon />
              Back to Application
            </Link>
          </Button>
        </ButtonGroup>
        <Box p={4} mt="auto" bg="bg" rounded="lg">
          <Heading size="xs" as="p" color="fg.muted">
            Available Prompts
          </Heading>
          <Progress.Root
            size="xs"
            min={0}
            max={totalPrompts}
            value={usedPrompts}
            minW="6rem"
            rounded="full"
            colorPalette="primary"
          >
            <Progress.Label
              mb={2}
              fontSize="xs"
              fontWeight="normal"
              color="fg.subtle"
            >
              {usedPrompts}/{totalPrompts}
            </Progress.Label>
            <Progress.Track>
              <Progress.Range />
            </Progress.Track>
          </Progress.Root>
        </Box>
        <Button
          size="sm"
          w="full"
          gap={2}
          variant="outline"
          justifyContent="flex-start"
          onClick={logout}
          title="Sign Out"
        >
          <UserIcon />
          <Text mr="auto">{userEmail || "User"}</Text>
          <SignOutIcon />
        </Button>
      </Flex>
      <Box maxH="100%" overflowY="auto">
        {children}
      </Box>
    </Box>
  );
}
