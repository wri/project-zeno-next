import { Flex, Text } from "@chakra-ui/react";
import { SparkleIcon } from "@phosphor-icons/react";

function ChatPanelHeader() {
  return (
    <Flex
      h="40px"
      mt="3"
      mx="3"
      px="3"
      py="1"
      bg="#f4f5f6"
      rounded="sm"
      alignItems="center"
      gap="2"
      hideBelow="md"
    >
      <SparkleIcon size={16} color="#656e7b" />
      <Text
        fontFamily="mono"
        fontSize="10px"
        lineHeight="16px"
        fontWeight="normal"
        letterSpacing="0.3px"
        textTransform="uppercase"
        color="#656e7b"
      >
        AI Assistant
      </Text>
    </Flex>
  );
}

export default ChatPanelHeader;
