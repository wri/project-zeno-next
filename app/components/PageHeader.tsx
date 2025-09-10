import {
  Flex,
  Heading,
  Button,
  Progress,
  Badge,
  Menu,
  Portal,
  Link as ChakraLink,
} from "@chakra-ui/react";
import LclLogo from "./LclLogo";
import {
  GearSixIcon,
  LifebuoyIcon,
  SignOutIcon,
  UserIcon,
} from "@phosphor-icons/react";
import useAuthStore from "../store/authStore";
import Link from "next/link";
import { REDIRECT_URL_KEY, wriAuthUrl } from "./LoginOverlay";

function PageHeader() {
  const { userEmail, usedPrompts, totalPrompts, isAuthenticated, clearAuth } =
    useAuthStore();

  const handleLoginClick = () => {
    localStorage.setItem(REDIRECT_URL_KEY, window.location.pathname);
    const callbackUrl = `${window.location.origin}/auth/callback`;
    const authUrl = `${wriAuthUrl}?callbackUrl=${encodeURIComponent(
      callbackUrl
    )}&token=true`;
    window.open(authUrl, "WRI Login", "width=600,height=700");
  };

  return (
    <Flex
      alignItems="center"
      justifyContent="space-between"
      px="5"
      py="2"
      h="12"
      bg="primary.solid"
      color="fg.inverted"
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
          BETA
        </Badge>
      </Flex>
      <Flex gap="6" alignItems="center">
        <Button
          variant="solid"
          colorPalette="primary"
          _hover={{ bg: "primary.fg" }}
          size="sm"
        >
          <LifebuoyIcon />
          Help
        </Button>

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
            color="primary.100"
          >
            {usedPrompts}/{totalPrompts} Prompts
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
                    onClick={() => clearAuth()}
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
            variant="solid"
            colorPalette="primary"
            _hover={{ bg: "primary.fg" }}
            size="sm"
            onClick={handleLoginClick}
          >
              <UserIcon />
              Log in / Sign Up
          </Button>
        )}
      </Flex>
    </Flex>
  );
}

export default PageHeader;
