import { useEffect } from "react";
import {
  Button,
  Flex,
  IconButton,
  Stack,
  Link as ChLink,
  Status,
  Heading,
  Box,
  Badge,
  Progress,
} from "@chakra-ui/react";
import { Link } from "@/app/lib/router";

import { Tooltip } from "./components/ui/tooltip";
import {
  LifebuoyIcon,
  NotePencilIcon,
  SidebarSimpleIcon,
  SignOutIcon,
  UserIcon,
} from "@phosphor-icons/react";
import useSidebarStore from "./store/sidebarStore";
import useAuthStore from "./store/authStore";
import { useLogout } from "./hooks/useLogout";
import { useStartNewConversation } from "./hooks/useStartNewConversation";
import ConversationHistoryList from "./components/ConversationHistoryList";
import LclLogo from "./components/LclLogo";

export function Sidebar() {
  const { sideBarVisible, toggleSidebar, apiStatus, fetchApiStatus } =
    useSidebarStore();
  const { userEmail, usedPrompts, totalPrompts } = useAuthStore();

  useEffect(() => {
    fetchApiStatus();
  }, [fetchApiStatus]);

  const { logout, isLoggingOut } = useLogout();
  const startNewConversation = useStartNewConversation();

  return (
    <Flex
      flexDir="column"
      bg="bg.subtle"
      w={{ base: "full", md: !sideBarVisible ? "0px" : "428px" }}
      h="100%"
      gridArea="sidebar"
      overflow="hidden"
      transition="width 0.3s"
      tabIndex={!sideBarVisible ? -1 : undefined}
      aria-hidden={!sideBarVisible}
      inert={!sideBarVisible}
      zIndex={1100}
      position="relative"
    >
      <Flex
        alignItems="center"
        justifyContent="space-between"
        p={3}
        bg="primary.solid"
        color="fg.inverted"
        hideFrom="md"
      >
        <Flex gap="2" alignItems="center">
          <ChLink
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
          </ChLink>
          <Badge
            colorPalette="primary"
            bg="primary.800"
            letterSpacing="wider"
            variant="solid"
            size="xs"
          >
            PREVIEW
          </Badge>
        </Flex>
      </Flex>
      <Flex
        px="3"
        py={2}
        pt={{ base: 3, md: 2 }}
        h={{ base: "auto", md: 14 }}
        justify="space-between"
        alignItems="center"
        position="sticky"
        top="0"
        bg="bg.subtle"
        boxShadow="xs"
      >
        <Button
          variant="outline"
          colorPalette="primary"
          size="sm"
          w={{ base: "full", md: "auto" }}
          aria-label="New conversation"
          onClick={() => {
            startNewConversation();
            toggleSidebar();
          }}
        >
          New Conversation
          <NotePencilIcon />
        </Button>
        <Tooltip
          content="Close sidebar"
          positioning={{ placement: "right" }}
          showArrow
        >
          <IconButton
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            hideBelow="md"
          >
            <SidebarSimpleIcon />
          </IconButton>
        </Tooltip>
      </Flex>
      <Stack
        flex="1"
        py="2"
        overflow="auto"
        css={{
          '& > [role="separator"]:first-of-type': {
            display: "none",
          },
        }}
      >
        <ConversationHistoryList onThreadOpen={toggleSidebar} />
        <Status.Root
          colorPalette={apiStatus === "OK" ? "green" : "red"}
          m="3"
          mt="auto"
          size="sm"
          px="2"
          py="1"
          rounded="sm"
          bg="whiteAlpha.600"
          borderColor="bg"
          borderWidth="1px"
        >
          <Status.Indicator />
          API Status: {apiStatus}
        </Status.Root>
        <Box m={3} display="flex" flexDir="column" gap={2} hideFrom="md">
          <Box bg="white" rounded="md" fontSize="sm" px={4} py={5}>
            Available Prompts
            <Progress.Root
              size="xs"
              min={0}
              max={100}
              value={(usedPrompts / totalPrompts) * 100}
              minW="6rem"
              rounded="full"
              colorPalette="primary"
            >
              <Progress.Label mb="0.5" fontSize="xs" fontWeight="normal">
                {usedPrompts}/{totalPrompts} Prompts
              </Progress.Label>
              <Progress.Track bg="neutral.200" maxH="4px">
                <Progress.Range bg="primary.solid" />
              </Progress.Track>
            </Progress.Root>
          </Box>
          <Button variant="ghost" size="sm" justifyContent="flex-start">
            <LifebuoyIcon />
            Help
          </Button>
          <Button
            variant="ghost"
            onClick={logout}
            size="sm"
            loading={isLoggingOut}
            disabled={isLoggingOut}
            justifyContent="flex-start"
            title="Log Out"
          >
            <UserIcon />
            {userEmail || "User name"}
            <SignOutIcon />
          </Button>
        </Box>
      </Stack>
    </Flex>
  );
}
