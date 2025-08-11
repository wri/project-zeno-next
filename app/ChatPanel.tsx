"use client";

import {
  Flex,
  Box,
  Text,
} from "@chakra-ui/react";
import ChatInput from "./components/ChatInput";
import ChatMessages from "./components/ChatMessages";
import ChatPanelHeader from "./ChatPanelHeader";

function ChatPanel() {
  
  return (
    <Flex minH="100%" maxH="100%" flexDir="column" gridArea="chat">
      <ChatPanelHeader />
      <Flex
        p="2"
        position="relative"
        flex="1"
        flexDir="column" 
        height="100%"
        overflow="auto"
      >
        <Box flex="1" overflowY="auto" height="100%" px="4" pb="8">
          <ChatMessages />
        </Box>
        <Box mt="auto" position="sticky" bottom="2">
          <ChatInput />
          <Text fontSize="xs" color="fg.subtle">AI can make mistakes. Please verify any outputs before using them in your work.</Text>
        </Box>
      </Flex>
    </Flex>
  );
}

export default ChatPanel;
