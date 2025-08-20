"use client";

import { Flex, Box, Button, Text } from "@chakra-ui/react";
import { Toaster, toaster } from "@/app/components/ui/toaster";
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
        <Toaster />
        <Button
          variant="outline"
          onClick={() =>
            toaster.create({
              title: "This is a description of the problem",
              description:
                "Lorem ipsum dolor sit amet consectetur adipisicing elit. Aliquid pariatur, ipsum dolor.",
              type: "error",
              closable: true,
              duration: 600000,
            })
          }
        >
          Hello
        </Button>
        {/* <Box flex="1" overflowY="auto" height="100%" mx="-4" px="4" pb="8"> */}
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
