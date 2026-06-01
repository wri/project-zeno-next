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
      bg="neutral.200"
      rounded="sm"
      alignItems="center"
      gap="2"
      hideBelow="md"
    >
      <SparkleIcon size={16} color="var(--chakra-colors-neutral-500)" />
      <Text
        fontFamily="mono"
        fontSize="10px"
        lineHeight="16px"
        fontWeight="normal"
        letterSpacing="0.3px"
        textTransform="uppercase"
        color="neutral.500"
      >
        AI Assistant
      </Text>
    </Flex>
  );
}

export default ChatPanelHeader;
