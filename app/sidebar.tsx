import { useEffect } from "react";
import {
  Button,
  Circle,
  Flex,
  HStack,
  IconButton,
  LinkProps,
  Separator,
  Stack,
  Text,
  Link as ChLink,
  Status,
} from "@chakra-ui/react";
import Link from "next/link";

import { Tooltip } from "./components/ui/tooltip";
import { NotePencilIcon, SidebarSimpleIcon } from "@phosphor-icons/react";
import useSidebarStore from "./store/sidebarStore";
import useChatStore from "./store/chatStore";

function ThreadLink(props: LinkProps & { isActive?: boolean; href: string }) {
  const { isActive, href, children, ...rest } = props;
  return (
    <ChLink
      fontSize="sm"
      _hover={{ textDecor: "none", layerStyle: "fill.muted" }}
      p="2"
      px="1"
      mx="2"
      borderRadius="sm"
      whiteSpace="nowrap"
      overflow="hidden"
      textOverflow="ellipsis"
      display="block"
      {...(isActive
        ? {
            bg: "bg",
            color: "primary.fg",
          }
        : {})}
      {...rest}
      asChild
    >
      <Link href={href}>{children}</Link>
    </ChLink>
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
        {hasTodayThreads && (
          <Stack gap="1" flex="1" mt="2">
            <Text fontSize="xs" color="fg.muted" px="3">
              Today
            </Text>
            {threadGroups.today.map((thread) => (
              <ThreadLink
                key={thread.id}
                href={`/threads/${thread.id}`}
                isActive={currentThreadId === thread.id}
              >
                {thread.name}
              </ThreadLink>
            ))}
          </Stack>
        )}
        <Separator my="4" />
        {hasPreviousWeekThreads && (
          <Stack gap="1" flex="1" mt="2">
            <Text fontSize="xs" color="fg.muted" px="3">
              Previous 7 days
            </Text>
            {threadGroups.previousWeek.map((thread) => (
              <ThreadLink
                key={thread.id}
                href={`/threads/${thread.id}`}
                isActive={currentThreadId === thread.id}
              >
                {thread.name}
              </ThreadLink>
            ))}
          </Stack>
        )}
        <Separator my="4" />
        {hasOlderThreads && (
          <Stack gap="1" flex="1" mt="2">
            <Text fontSize="xs" color="fg.muted" px="3">
              Older Conversations
            </Text>
            {threadGroups.older.map((thread) => (
              <ThreadLink
                key={thread.id}
                href={`/threads/${thread.id}`}
                isActive={currentThreadId === thread.id}
              >
                {thread.name}
              </ThreadLink>
            ))}
          </Stack>
        )}
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
