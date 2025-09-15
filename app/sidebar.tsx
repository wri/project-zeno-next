import { useEffect } from "react";
import {
  Button,
  Flex,
  IconButton,
  LinkProps,
  Stack,
  Text,
  Link as ChLink,
  Status,
  Heading,
  Accordion,
  Box,
  Badge,
  Progress,
} from "@chakra-ui/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
import useChatStore from "./store/chatStore";
import ThreadActionsMenu from "./components/ThreadActionsMenu";
import LclLogo from "./components/LclLogo";

function ThreadLink(props: LinkProps & { isActive?: boolean; href: string }) {
  const { href, children, isActive, ...rest } = props;
  return (
    <ChLink
      fontSize="sm"
      textDecor="none"
      _hover={{ textDecor: "none" }}
      whiteSpace="nowrap"
      overflow="hidden"
      textOverflow="ellipsis"
      display="block"
      flex="1"
      outline="none"
      {...(isActive
        ? {
            color: "primary.fg",
          }
        : {})}
      {...rest}
      asChild
    >
      <Link href={href} style={{ display: "block", width: "100%" }}>
        {children}
      </Link>
    </ChLink>
  );
}

function ThreadSection({
  threads,
  label,
  value,
  currentThreadId,
}: {
  threads: { id: string; name: string }[];
  label: string;
  value: string;
  currentThreadId: string | null;
}) {
  if (!threads.length) return null;
  return (
    <Accordion.Item value={value} border="none">
      <Accordion.ItemTrigger px="3" py="1" cursor="pointer">
        <Text
          fontSize="xs"
          fontWeight="normal"
          color="fg.subtle"
          ml="2"
          mr="auto"
        >
          {label}
        </Text>
        <Accordion.ItemIndicator />
      </Accordion.ItemTrigger>
      <Accordion.ItemContent px="0" pt="0">
        <Stack gap="1" mt="1">
          {threads.map((thread) => {
            const isActive = currentThreadId === thread.id;
            return (
              <Flex
                key={thread.id}
                align="center"
                justify="space-between"
                pl="2"
                pr="0"
                mx="4"
                borderRadius="sm"
                role="group"
                _hover={{ layerStyle: "fill.muted" }}
                _focusWithin={{
                  outline: "2px solid var(--chakra-colors-gray-400)",
                  outlineOffset: "2px",
                }}
                css={{
                  "&:hover .thread-actions": { opacity: 1 },
                  "&:focus-within .thread-actions": { opacity: 1 },
                }}
                {...(isActive ? { bg: "bg", color: "blue.fg" } : {})}
              >
                <ThreadLink
                  href={`/app/threads/${thread.id}`}
                  isActive={isActive}
                  _hover={{ textDecor: "none" }}
                >
                  {thread.name}
                </ThreadLink>
                <ThreadActionsMenu thread={thread} />
              </Flex>
            );
          })}
        </Stack>
      </Accordion.ItemContent>
    </Accordion.Item>
  );
}

const LANDING_PAGE_VERSION = process.env.NEXT_PUBLIC_LANDING_PAGE_VERSION;

export function Sidebar() {
  const {
    sideBarVisible,
    toggleSidebar,
    threadGroups,
    fetchThreads,
    apiStatus,
    fetchApiStatus,
  } = useSidebarStore();
  const { currentThreadId } = useChatStore();
  const { clearAuth, userEmail, usedPrompts, totalPrompts } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    fetchThreads();
    fetchApiStatus();
  }, [fetchThreads, fetchApiStatus]);

  const handleLogout = () => {
    if (LANDING_PAGE_VERSION === "public") {
      clearAuth();
    } else {
      router.push("/");
    }
  };

  const hasTodayThreads = threadGroups.today.length > 0;
  const hasPreviousWeekThreads = threadGroups.previousWeek.length > 0;
  const hasOlderThreads = threadGroups.older.length > 0;

  return (
    <Flex
      flexDir="column"
      bg="bg.subtle"
      w={{ base: "full", md: !sideBarVisible ? "0px" : "16rem" }}
      h="100%"
      gridArea="sidebar"
      overflow="hidden"
      transition="width 0.3s"
      tabIndex={!sideBarVisible ? -1 : undefined}
      aria-hidden={!sideBarVisible}
      inert={!sideBarVisible}
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
            BETA
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
          asChild
          variant="outline"
          colorPalette="primary"
          size="sm"
          w={{ base: "full", md: "auto" }}
        >
          <Link href="/app" aria-label="New conversation">
            New Conversation
            <NotePencilIcon />
          </Link>
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
        <Accordion.Root
          multiple
          defaultValue={["today", "previousWeek", "older"]}
        >
          {hasTodayThreads && (
            <ThreadSection
              threads={threadGroups.today}
              label="Today"
              value="today"
              currentThreadId={currentThreadId}
            />
          )}
          {hasPreviousWeekThreads && (
            <ThreadSection
              threads={threadGroups.previousWeek}
              label="Previous 7 days"
              value="previousWeek"
              currentThreadId={currentThreadId}
            />
          )}
          {hasOlderThreads && (
            <ThreadSection
              threads={threadGroups.older}
              label="Older Conversations"
              value="older"
              currentThreadId={currentThreadId}
            />
          )}
        </Accordion.Root>
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
            onClick={handleLogout}
            size="sm"
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
