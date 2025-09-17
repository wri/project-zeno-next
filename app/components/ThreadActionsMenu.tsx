import { useState, useCallback } from "react";
import { Menu, Portal, IconButton } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import useSidebarStore from "../store/sidebarStore";
import useChatStore from "../store/chatStore";
import {
  DotsThreeIcon,
  PencilSimpleIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import ThreadDeleteDialog from "./ThreadDeleteDialog";
import ThreadRenameDialog from "./ThreadRenameDialog";
import { sendGAEvent } from "@next/third-parties/google";

function ThreadActionsMenu({
  thread,
  children,
}: {
  thread: { id: string; name: string };
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const { renameThread, deleteThread } = useSidebarStore();
  const { currentThreadId } = useChatStore();

  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const onRename = useCallback(
    async (name: string) => {
      sendGAEvent("event", "thread_renamed", {
        old_thread_name: thread.name,
        new_thread_name: name,
        thread_id: thread.id,
      });
      await renameThread(thread.id, name);
      setRenameOpen(false);
    },
    [thread.id, thread.name, renameThread]
  );

  const onDelete = useCallback(async () => {
    sendGAEvent("event", "thread_deleted", { 
      thread_name: thread.name,
      thread_id: thread.id,
     });
    try {
      await deleteThread(thread.id);
      if (currentThreadId === thread.id) {
        router.replace("/app");
      }
    } catch (e) {
      console.error("Failed to delete thread", e);
    }
  }, [currentThreadId, thread.id, thread.name, router, deleteThread]);

  return (
    <>
      <Menu.Root>
        <Menu.Trigger asChild>
          {children || (
            <IconButton
              aria-label={`Thread actions for ${thread.name}`}
              variant="ghost"
              size="xs"
              mr="1"
              opacity="0"
              transition="opacity 0.15s"
              className="thread-actions"
              _focusVisible={{ opacity: 1 }}
              _hover={{ bg: "blackAlpha.50/50" }}
              _active={{ bg: "blackAlpha.50/50" }}
            >
              <DotsThreeIcon size={20} weight="bold" />
            </IconButton>
          )}
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
      <ThreadRenameDialog
        name={thread.name}
        isOpen={renameOpen}
        onOpenChange={setRenameOpen}
        onRename={onRename}
      />
      <ThreadDeleteDialog
        threadName={thread.name}
        isOpen={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={onDelete}
      />
    </>
  );
}

export default ThreadActionsMenu;
