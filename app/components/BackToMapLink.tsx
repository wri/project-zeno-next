import { Flex, Link as ChakraLink, Text } from "@chakra-ui/react";
import { ArrowLeftIcon } from "@phosphor-icons/react";
import { Link } from "@/src/shared/lib/router";
import useChatStore from "@/app/store/chatStore";
import { useThreadsInfinite } from "@/app/hooks/useThreadsInfinite";
import { mapTabHref } from "@/app/utils/threadNavigation";

/**
 * The settings pages' way back to the map (canvas option 12A): top-left,
 * naming the conversation it returns to. Like the header's Map tab, it lands
 * on the live thread's URL, which keeps the chat and layers, rather than on
 * /app, which resets them.
 */
export default function BackToMapLink() {
  const currentThreadId = useChatStore((s) => s.currentThreadId);
  // With no conversation under way there's nothing to name, so no fetch.
  const { threads } = useThreadsInfinite({ enabled: currentThreadId !== null });
  const threadName = threads.find((t) => t.id === currentThreadId)?.name;

  return (
    <ChakraLink
      as={Link}
      href={mapTabHref(currentThreadId)}
      display="flex"
      flexDir="column"
      // Chakra's link centres its children; stretched, the title is held to
      // the card's width and truncates instead of overflowing it.
      alignItems="stretch"
      gap="0.5"
      px="3"
      py="2.5"
      bg="bg"
      borderWidth="1px"
      borderColor="neutral.300"
      rounded="md"
      textDecoration="none"
      transition="background 0.16s ease, border-color 0.16s ease"
      _hover={{
        textDecoration: "none",
        bg: "primary.25",
        borderColor: "primary.200",
      }}
    >
      <Flex
        align="center"
        gap="2"
        fontSize="sm"
        fontWeight="semibold"
        color="primary.500"
      >
        <ArrowLeftIcon size={16} />
        Back to map
      </Flex>
      {threadName && (
        <Text
          fontSize="xs"
          color="neutral.500"
          pl="6"
          truncate
          title={threadName}
        >
          {threadName}
        </Text>
      )}
    </ChakraLink>
  );
}
