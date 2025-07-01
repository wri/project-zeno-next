import {
  Button,
  Circle,
  Flex,
  HStack,
  IconButton,
  Link,
  Menu,
  Portal,
  Separator,
  Stack,
  Text,
} from "@chakra-ui/react";
import { Tooltip } from "./components/ui/tooltip";

import { NotePencilIcon, SidebarSimpleIcon } from "@phosphor-icons/react";
import useSidebarStore from "./store/sidebarStore";

export function Sidebar() {
  const { sideBarVisible, toggleSidebar } = useSidebarStore();
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
        <Menu.Root>
          <Menu.Trigger asChild>
            <Button variant="solid" colorPalette="blue" size="sm">
              New Conversation
              <NotePencilIcon />
            </Button>
          </Menu.Trigger>
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
      <Stack flex="1" py="2" overflow="auto">
        <Stack gap="0" flex="1" mt="2">
          <Text fontSize="xs" color="fg.muted" px="3">
            Today
          </Text>
          <Link
            href="#"
            fontSize="sm"
            color="blue.fg"
            _hover={{ textDecor: "none", layerStyle: "fill.muted" }}
            p="2"
            px="1"
            mx="2"
            borderRadius="sm"
            whiteSpace="nowrap"
            overflow="hidden"
            textOverflow="ellipsis"
            display="block"
            bg="bg"
          >
            KBA&apos;s in Brazil
          </Link>
          <Link
            href="#"
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
          >
            Another conversation
          </Link>
          <Link
            href="#"
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
          >
            Yet another one
          </Link>
          <Separator my="4" />
          <Text fontSize="xs" px="3">
            Previous 7 days
          </Text>
          <Link
            href="#"
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
          >
            Past conversation
          </Link>
          <Link
            href="#"
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
          >
            Conversation with a looong name that gets truncated
          </Link>
          <Link
            href="#"
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
          >
            Yet another one
          </Link>
        </Stack>

        <Link
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
        </Link>
      </Stack>
    </Flex>
  );
}
