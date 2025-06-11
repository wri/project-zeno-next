"use client";

import { Flex, Box } from "@chakra-ui/react";
import ChatInput from "./components/ChatInput";
import ChatMessages from "./components/ChatMessages";
import ChatPanelHeader from "./ChatPanelHeader";

function ChatPanel() {
  return (
    <Flex
      minH="100%"
      maxH="100%"
      w="36rem"
      flexDir="column"
      gridArea="chat"
      resize="horizontal"
      position="relative"
      overflow="hidden"
    >
      <ChatPanelHeader />
      <Box
        transform-origin="100% 100%"
        scale="4"
        clip-path="inset(calc(100% - 12px) 0 0 calc(100% - 12px))"
        position="absolute"
        top="0"
        bottom="0"
        right="0"
        zIndex="10"
        borderRight="2px solid transparent"
        cursor="col-resize"
        resize="horizontal"
        _hover={{
          borderColor: "blue"
        }}
      />
      <Flex
        p="4"
        pb="2"
        position="relative"
        flex="1"
        flexDir="column"
        height="100%"
        overflow="auto"
      >
        <Box flex="1" overflowY="auto" height="100%" mx="-4" px="4" pb="8">
          <ChatMessages />
        </Box>
        <Box mt="auto" position="sticky" bottom="2">
          <ChatInput />
        </Box>
      </Flex>
    </Flex>
  );
}

export default ChatPanel;
