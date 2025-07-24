import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  Flex,
  IconButton,
  Menu,
  Button,
  Portal,
  Dialog,
  Input,
} from "@chakra-ui/react";
import {
  SidebarIcon,
  CaretDownIcon,
  PencilSimpleIcon,
  TrashIcon,
  NotePencilIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Tooltip } from "./components/ui/tooltip";
import useSidebarStore from "./store/sidebarStore";
import useChatStore from "./store/chatStore";

function ChatPanelHeader() {
  const triggerId = useId();
  const router = useRouter();
  const {
    sideBarVisible,
    toggleSidebar,
    renameThread,
    deleteThread,
    getThreadById,
  } = useSidebarStore();
  const { currentThreadId } = useChatStore();

  const [renameDialogVisible, setRenameDialogVisible] = useState(false);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);

  const onThreadRename = useCallback(
    (name: string) => {
      if (!currentThreadId) return;
      renameThread(currentThreadId, name);
    },
    [currentThreadId, renameThread]
  );

  const onThreadDelete = useCallback(async () => {
    if (!currentThreadId) return;
    try {
      await deleteThread(currentThreadId);
      router.replace("/");
    } catch (error) {
      console.log("error", error);
    }
  }, [currentThreadId, deleteThread, router]);

  const currentThread = getThreadById(currentThreadId);
  const currentThreadName = currentThread
    ? currentThread.name
    : "New Conversation";

  return (
    <Flex
      alignItems="center"
      justifyContent="space-between"
      px="4"
      py="2"
      gap="1"
      h="14"
      bg="bg"
      color="fg"
      boxShadow="sm"
    >
      {!sideBarVisible && (
        <Tooltip
          content="Open sidebar"
          positioning={{ placement: "right" }}
          showArrow
        >
          <IconButton
            size="sm"
            variant="ghost"
            color="fg.muted"
            onClick={toggleSidebar}
          >
            <SidebarIcon />
          </IconButton>
        </Tooltip>
      )}
      {currentThread ? (
        <Menu.Root>
          <Menu.Trigger asChild>
            <Button variant="ghost" size="sm" mr="auto">
              {currentThreadName}
              <CaretDownIcon />
            </Button>
          </Menu.Trigger>
          <Portal>
            <Menu.Positioner>
              <Menu.Content>
                <Menu.Item
                  value="rename conversation"
                  color="fg.muted"
                  onSelect={() => setRenameDialogVisible(true)}
                >
                  <PencilSimpleIcon />
                  Rename
                </Menu.Item>
                <Menu.Item
                  value="delete"
                  color="fg.error"
                  _hover={{ bg: "bg.error", color: "fg.error" }}
                  onSelect={() => setDeleteDialogVisible(true)}
                >
                  <TrashIcon />
                  Delete
                </Menu.Item>
              </Menu.Content>
            </Menu.Positioner>
          </Portal>
        </Menu.Root>
      ) : (
        <Button variant="ghost" size="sm" mr="auto">
          {currentThreadName}
        </Button>
      )}
      {!sideBarVisible && (
        <Menu.Root ids={{ trigger: triggerId }}>
          <Tooltip
            content="New conversation"
            showArrow
            ids={{ trigger: triggerId }}
          >
            <Menu.Trigger asChild>
              <IconButton variant="ghost" size="sm">
                <NotePencilIcon />
              </IconButton>
            </Menu.Trigger>
          </Tooltip>
          <Portal>
            <Menu.Positioner>
              <Menu.Content>
                <Menu.Item
                  value="New blank conversation"
                  color="fg.muted"
                  asChild
                >
                  <Link href="/">Blank Conversation</Link>
                </Menu.Item>
                <Menu.Item
                  value="New conversation from template"
                  color="fg.muted"
                >
                  From Template
                </Menu.Item>
              </Menu.Content>
            </Menu.Positioner>
          </Portal>
        </Menu.Root>
      )}

      <ThreadRenameDialog
        name={currentThreadName}
        isOpen={renameDialogVisible}
        onOpenChange={setRenameDialogVisible}
        onRename={onThreadRename}
      />
      <ThreadDeleteDialog
        threadName={currentThreadName}
        isOpen={deleteDialogVisible}
        onOpenChange={setDeleteDialogVisible}
        onConfirm={onThreadDelete}
      />
    </Flex>
  );
}

export default ChatPanelHeader;

interface ThreadRenameDialogProps {
  name: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onRename: (newName: string) => void;
}

function ThreadRenameDialog(props: ThreadRenameDialogProps) {
  const { name, isOpen, onOpenChange, onRename } = props;
  const ref = useRef<HTMLInputElement>(null);
  const [threadName, setThreadName] = useState("");

  useEffect(() => {
    setThreadName(name);
  }, [name, isOpen]);

  const rename = useCallback(() => {
    onRename(threadName);
    onOpenChange(false);
  }, [threadName, onRename, onOpenChange]);

  return (
    <Dialog.Root
      initialFocusEl={() => ref.current}
      open={isOpen}
      onOpenChange={({ open }) => onOpenChange(open)}
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content
            as="form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!threadName) return;
              rename();
            }}
          >
            <Dialog.Header>
              <Dialog.Title>Rename thread</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body pb="4">
              <Input
                ref={ref}
                value={threadName}
                onChange={(e) => setThreadName(e.target.value)}
              />
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline">Cancel</Button>
              </Dialog.ActionTrigger>
              <Button colorPalette="blue" disabled={!threadName}>
                Save
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

interface ThreadDeleteDialogProps {
  threadName: string;
  onConfirm: () => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

function ThreadDeleteDialog(props: ThreadDeleteDialogProps) {
  const { threadName, onConfirm, isOpen, onOpenChange } = props;

  return (
    <Dialog.Root
      role="alertdialog"
      open={isOpen}
      onOpenChange={({ open }) => onOpenChange(open)}
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
                conversation <strong>{threadName}</strong> from our systems.
              </p>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline">Cancel</Button>
              </Dialog.ActionTrigger>
              <Dialog.ActionTrigger asChild>
                <Button
                  colorPalette="red"
                  onClick={() => {
                    onOpenChange(false);
                    onConfirm();
                  }}
                >
                  Delete
                </Button>
              </Dialog.ActionTrigger>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
