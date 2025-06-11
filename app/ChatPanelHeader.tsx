import { Flex, IconButton, Menu, Button, Portal } from "@chakra-ui/react";
import { Tooltip } from "./components/ui/tooltip";
import { useSidebarContext } from "./sidebar-context";
import {
  SidebarIcon,
  CaretDownIcon,
  PencilSimpleIcon,
  TrashIcon,
  NotePencilIcon,
} from "@phosphor-icons/react";
import { useId } from "react";

function ChatPanelHeader() {
  const triggerId = useId();
  const { sideBarVisible, toggleSidebar } = useSidebarContext();
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
          <IconButton size="sm" variant="ghost" color="fg.muted" onClick={toggleSidebar}>
            <SidebarIcon />
          </IconButton>
        </Tooltip>
      )}
      <Menu.Root>
        <Menu.Trigger asChild>
          <Button variant="ghost" size="sm" mr="auto">
            Conversation Name
            <CaretDownIcon />
          </Button>
        </Menu.Trigger>
        <Portal>
          <Menu.Positioner>
            <Menu.Content>
              <Menu.Item value="rename conversation" color="fg.muted">
                <PencilSimpleIcon />
                Rename
              </Menu.Item>
              <Menu.Item
                value="delete"
                color="fg.error"
                _hover={{ bg: "bg.error", color: "fg.error" }}
              >
                <TrashIcon />
                Delete
              </Menu.Item>
            </Menu.Content>
          </Menu.Positioner>
        </Portal>
      </Menu.Root>
      {!sideBarVisible && (
        <Menu.Root ids={{ trigger: triggerId }}>
          <Tooltip content="New conversation" showArrow ids={{ trigger: triggerId }}>
            <Menu.Trigger asChild>
              <IconButton variant="ghost" size="sm">
                <NotePencilIcon />
              </IconButton>
            </Menu.Trigger>
          </Tooltip>
          <Portal>
            <Menu.Positioner>
              <Menu.Content>
                <Menu.Item value="New blank conversation" color="fg.muted">
                  Blank Conversation
                </Menu.Item>
                <Menu.Item value="New conversation from template" color="fg.muted">
                  From Template
                </Menu.Item>
              </Menu.Content>
            </Menu.Positioner>
          </Portal>
        </Menu.Root>
      )}
    </Flex>
  );
}

export default ChatPanelHeader;
