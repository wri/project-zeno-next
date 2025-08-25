import { useEffect } from "react";
import {
  Button,
  Circle,
  Flex,
  HStack,
  IconButton,
  LinkProps,
  Stack,
  Text,
  Link as ChLink,
  Status,
  Accordion,
} from "@chakra-ui/react";
import Link from "next/link";

import { Tooltip } from "./components/ui/tooltip";
import {
  NotePencilIcon,
  SidebarSimpleIcon
} from "@phosphor-icons/react";
import useSidebarStore from "./store/sidebarStore";
import useChatStore from "./store/chatStore";
import ThreadActionsMenu from "./components/ThreadActionsMenu";

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
                _focusWithin={{ outline: "2px solid var(--chakra-colors-gray-400)", outlineOffset: "2px" }}
                css={{
                  "&:hover .thread-actions": { opacity: 1 },
                  "&:focus-within .thread-actions": { opacity: 1 },
                }}
                {...(isActive ? { bg: "bg", color: "blue.fg" } : {})}
              >
                <ThreadLink
                  href={`/threads/${thread.id}`}
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

  useEffect(() => {
    fetchThreads();
    fetchApiStatus();
  }, [fetchThreads, fetchApiStatus]);

  const hasTodayThreads = threadGroups.today.length > 0;
  const hasPreviousWeekThreads = threadGroups.previousWeek.length > 0;
  const hasOlderThreads = threadGroups.older.length > 0;

  return (
    <Flex
      flexDir="column"
      bg="bg.muted"
      w={!sideBarVisible ? "0px" : "16rem"}
      h="100%"
      gridArea="sidebar"
      overflow="hidden"
      transition="width 0.3s"
      tabIndex={!sideBarVisible ? -1 : undefined}
      aria-hidden={!sideBarVisible}
      inert={!sideBarVisible}
    >
      <Flex
        px="3"
        py="2"
        h="14"
        justify="space-between"
        alignItems="center"
        position="sticky"
        top="0"
        bg="bg.muted"
        boxShadow="xs"
      >
        <Button asChild variant="solid" colorPalette="primary" size="sm">
          <Link href="/">
            New Conversation
            <NotePencilIcon />
          </Link>
        </Button>
        <Tooltip
          content="Close sidebar"
          positioning={{ placement: "right" }}
          showArrow
        >
          <IconButton variant="ghost" size="sm" onClick={toggleSidebar}>
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
        <ChLink
          href="#"
          _hover={{ textDecor: "none", layerStyle: "fill.muted" }}
          borderRadius="lg"
          px="1"
          py="2"
        >
          <HStack whiteSpace="nowrap">
            <Circle size="8" fontSize="lg" borderWidth="1px"></Circle>
            <Stack gap="0" fontWeight="medium">
              <Text fontSize="sm">Understand</Text>
              <Text fontSize="xs" color="fg.subtle">
                More information
              </Text>
            </Stack>
          </HStack>
        </ChLink>
      </Stack>
    </Flex>
  );
}
