"use client";

import {
  Flex,
  Box,
} from "@chakra-ui/react";
import ChatInput from "./components/ChatInput";
import ChatMessages from "./components/ChatMessages";
import ChatPanelHeader from "./ChatPanelHeader";

function ChatPanel() {
  
  return (
    <Flex minH="100%" maxH="100%" flexDir="column" gridArea="chat">
      <ChatPanelHeader />
      <Box
        p="4"
        pb="2"
        position="relative"
        flex="1"
        height="100%"
        overflow="auto"
      >
        <Box overflowY="auto" height="100%" mx="-4" px="4" pb="8">
          <ChatMessages />
        </Box>
        <Box mt="auto" position="sticky" bottom="2">
          <ChatInput />
        </Box>
      </Box>
    </Flex>
  );
}

export default ChatPanel;
