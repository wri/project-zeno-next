import { Flex, IconButton, Button } from "@chakra-ui/react";
import {
  SidebarIcon,
  CaretDownIcon,
  NotePencilIcon,
} from "@phosphor-icons/react";
import Link from "next/link";

import { Tooltip } from "./components/ui/tooltip";
import useSidebarStore from "./store/sidebarStore";
import useChatStore from "./store/chatStore";
import ThreadActionsMenu from "./components/ThreadActionsMenu";

function ChatPanelHeader() {
  const { sideBarVisible, toggleSidebar, getThreadById } = useSidebarStore();
  const { currentThreadId } = useChatStore();

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
      {currentThreadId ? (
        <ThreadActionsMenu
          thread={{ id: currentThreadId, name: currentThreadName }}
        >
          <Button variant="ghost" size="sm" mr="auto">
            {currentThreadName}
            <CaretDownIcon />
          </Button>
        </ThreadActionsMenu>
      ) : (
        <Button variant="ghost" size="sm" mr="auto">
          {currentThreadName}
        </Button>
      )}
      {!sideBarVisible && (
        <Tooltip content="New conversation" showArrow>
          <IconButton asChild variant="ghost" size="sm">
            <Link href="/">
              <NotePencilIcon />
            </Link>
          </IconButton>
        </Tooltip>
      )}
    </Flex>
  );
}

export default ChatPanelHeader;
