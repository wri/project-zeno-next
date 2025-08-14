import { useEffect, useState } from "react";
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
  Accordion,
  Menu,
  Portal,
  Dialog,
  Input,
} from "@chakra-ui/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Tooltip } from "./components/ui/tooltip";
import { NotePencilIcon, SidebarSimpleIcon, DotsThreeIcon, PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";
import useSidebarStore from "./store/sidebarStore";
import useChatStore from "./store/chatStore";

function ThreadLink(props: LinkProps & { isActive?: boolean; href: string }) {
  const { isActive, href, children, ...rest } = props;
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
      _focus={{ boxShadow: "none", bg: "transparent", outline: "none" }}
      _focusVisible={{ boxShadow: "0 0 0 2px var(--chakra-colors-gray-400)" }}
      {...rest}
      asChild
    >
      <Link href={href} style={{ display: 'block', width: '100%' }}>{children}</Link>
    </ChLink>
  );
}

function ThreadActionsMenu({
  thread,
}: {
  thread: { id: string; name: string };
}) {
  const router = useRouter();
  const { renameThread, deleteThread } = useSidebarStore();
  const { currentThreadId } = useChatStore();

  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [threadName, setThreadName] = useState(thread.name);

  useEffect(() => {
    setThreadName(thread.name);
  }, [thread.name, renameOpen]);

  const onRename = async () => {
    await renameThread(thread.id, threadName);
    setRenameOpen(false);
  };

  const onDelete = async () => {
    try {
      await deleteThread(thread.id);
      setDeleteOpen(false);
      if (currentThreadId === thread.id) {
        router.replace("/");
      }
    } catch (e) {
      console.error("Failed to delete thread", e);
    }
  };

  return (
    <>
      <Menu.Root>
        <Menu.Trigger asChild>
          <IconButton
            aria-label={`Thread actions for ${thread.name}`}
            variant="ghost"
            size="xs"
            mr="2"
            opacity="0"
            transition="opacity 0.15s"
            className="thread-actions"
            _focusVisible={{ opacity: 1 }}
            _hover={{ bg: "transparent" }}
            _active={{ bg: "transparent" }}
          >
            <DotsThreeIcon
              size={20}
              weight="bold"
            />
          </IconButton>
        </Menu.Trigger>
        <Portal>
          <Menu.Positioner>
            <Menu.Content>
              <Menu.Item
                value="rename conversation"
                color="fg.muted"
                onSelect={() => setRenameOpen(true)}
              >
                <PencilSimpleIcon />
                Rename
              </Menu.Item>
              <Menu.Item
                value="delete"
                color="fg.error"
                _hover={{ bg: "bg.error", color: "fg.error" }}
                onSelect={() => setDeleteOpen(true)}
              >
                <TrashIcon />
                Delete
              </Menu.Item>
            </Menu.Content>
          </Menu.Positioner>
        </Portal>
      </Menu.Root>

      <Dialog.Root
        open={renameOpen}
        onOpenChange={({ open }) => setRenameOpen(open)}
        initialFocusEl={undefined}
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content
              as="form"
              onSubmit={(e) => {
                e.preventDefault();
                if (!threadName) return;
                onRename();
              }}
            >
              <Dialog.Header>
                <Dialog.Title>Rename thread</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body pb="4">
                <Input
                  value={threadName}
                  onChange={(e) => setThreadName(e.target.value)}
                />
              </Dialog.Body>
              <Dialog.Footer>
                <Dialog.ActionTrigger asChild>
                  <Button variant="outline">Cancel</Button>
                </Dialog.ActionTrigger>
                <Button colorPalette="blue" disabled={!threadName} type="submit">
                  Save
                </Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>

      <Dialog.Root
        role="alertdialog"
        open={deleteOpen}
        onOpenChange={({ open }) => setDeleteOpen(open)}
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>Are you sure?</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <p>
                  This action cannot be undone. This will permanently delete the
                  conversation <strong>{thread.name}</strong> from our systems.
                </p>
              </Dialog.Body>
              <Dialog.Footer>
                <Dialog.ActionTrigger asChild>
                  <Button variant="outline">Cancel</Button>
                </Dialog.ActionTrigger>
                <Dialog.ActionTrigger asChild>
                  <Button colorPalette="red" onClick={onDelete}>
                    Delete
                  </Button>
                </Dialog.ActionTrigger>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </>
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
        <Button asChild variant="solid" colorPalette="blue" size="sm">
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
        <Accordion.Root multiple defaultValue={["today", "previousWeek", "older"]}>
          {hasTodayThreads && (
            <Accordion.Item value="today" border="none">
              <Accordion.ItemTrigger px="3" py="1">
                <Accordion.ItemIndicator />
                <Text fontSize="xs" color="fg.muted" ml="2">Today</Text>
              </Accordion.ItemTrigger>
              <Accordion.ItemContent px="0" pt="0">
                <Stack gap="1" mt="1">
                  {threadGroups.today.map((thread) => (
                    <Flex
                      key={thread.id}
                      align="center"
                      justify="space-between"
                      px="1"
                      mx="4"
                      p="0.5"
                      borderRadius="sm"
                      role="group"
                      _hover={{ layerStyle: "fill.muted" }}
                      css={{ '&:hover .thread-actions': { opacity: 1 }, '&:focus-within .thread-actions': { opacity: 1 } }}
                      {...(currentThreadId === thread.id
                        ? { color: "blue.fg" }
                        : {})}
                    >
                      <ThreadLink
                        href={`/threads/${thread.id}`}
                        isActive={currentThreadId === thread.id}
                        _hover={{ textDecor: "none" }}
                      >
                        {thread.name}
                      </ThreadLink>
                      <ThreadActionsMenu thread={thread} />
                    </Flex>
                  ))}
                </Stack>
              </Accordion.ItemContent>
            </Accordion.Item>
          )}
          {hasPreviousWeekThreads && (
            <Accordion.Item value="previousWeek" border="none">
              <Accordion.ItemTrigger px="3" py="1">
                <Accordion.ItemIndicator />
                <Text fontSize="xs" color="fg.muted" ml="2">Previous 7 days</Text>
              </Accordion.ItemTrigger>
              <Accordion.ItemContent px="0" pt="0">
                <Stack gap="1" mt="1">
                  {threadGroups.previousWeek.map((thread) => (
                    <Flex
                      key={thread.id}
                      align="center"
                      justify="space-between"
                      px="1"
                      mx="4"
                      p="0.5"
                      borderRadius="sm"
                      role="group"
                      _hover={{ layerStyle: "fill.muted" }}
                      css={{ '&:hover .thread-actions': { opacity: 1 }, '&:focus-within .thread-actions': { opacity: 1 } }}
                      {...(currentThreadId === thread.id
                        ? { bg: "bg", color: "blue.fg" }
                        : {})}
                    >
                      <ThreadLink
                        href={`/threads/${thread.id}`}
                        isActive={currentThreadId === thread.id}
                      >
                        {thread.name}
                      </ThreadLink>
                      <ThreadActionsMenu thread={thread} />
                    </Flex>
                  ))}
                </Stack>
              </Accordion.ItemContent>
            </Accordion.Item>
          )}
          {hasOlderThreads && (
            <Accordion.Item value="older" border="none">
              <Accordion.ItemTrigger px="3" py="1">
                <Accordion.ItemIndicator />
                <Text fontSize="xs" color="fg.muted" ml="2">Older Conversations</Text>
              </Accordion.ItemTrigger>
              <Accordion.ItemContent px="0" pt="0">
                <Stack gap="1" mt="1">
                  {threadGroups.older.map((thread) => (
                    <Flex
                      key={thread.id}
                      align="center"
                      justify="space-between"
                      px="1"
                      mx="4"
                      p="0.5"
                      borderRadius="sm"
                      role="group"
                      _hover={{ layerStyle: "fill.muted" }}
                      css={{ '&:hover .thread-actions': { opacity: 1 }, '&:focus-within .thread-actions': { opacity: 1 } }}
                      {...(currentThreadId === thread.id
                        ? { bg: "bg", color: "blue.fg" }
                        : {})}
                    >
                      <ThreadLink
                        href={`/threads/${thread.id}`}
                        isActive={currentThreadId === thread.id}
                      >
                        {thread.name}
                      </ThreadLink>
                      <ThreadActionsMenu thread={thread} />
                    </Flex>
                  ))}
                </Stack>
              </Accordion.ItemContent>
            </Accordion.Item>
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
