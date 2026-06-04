import { Flex, IconButton, Text } from "@chakra-ui/react";
import {
  SidebarSimpleIcon,
  SparkleIcon,
  CaretDownIcon,
} from "@phosphor-icons/react";
import useSidebarStore from "./store/sidebarStore";
import { Tooltip } from "./components/ui/tooltip";

function ChatPanelHeader() {
  const { toggleSidebar } = useSidebarStore();
  return (
    <Flex
      h="40px"
      px="3"
      py="1"
      bg="neutral.200"
      alignItems="center"
      gap="2"
      hideBelow="md"
      flexShrink={0}
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
      <Flex ml="auto" gap={1}>
        <Tooltip content="Toggle conversation history" showArrow>
          <IconButton
            size="2xs"
            variant="ghost"
            color="neutral.600"
            aria-label="Toggle conversation history"
            onClick={toggleSidebar}
          >
            <SidebarSimpleIcon size={16} />
          </IconButton>
        </Tooltip>
        <Tooltip content="Minimise panel" showArrow>
          <IconButton
            size="2xs"
            variant="ghost"
            color="neutral.600"
            aria-label="Minimise panel"
            onClick={() => {}}
          >
            <CaretDownIcon size={16} />
          </IconButton>
        </Tooltip>
      </Flex>
    </Flex>
  );
}

export default ChatPanelHeader;
