"use client";

import { useEffect } from "react";
import {
  Accordion,
  Box,
  Flex,
  Heading,
  IconButton,
  Stack,
  Text,
} from "@chakra-ui/react";
import { ArrowLeftIcon } from "@phosphor-icons/react";

import useExplorePanelStore from "@/app/store/explorePanelStore";
import useSidebarStore from "@/app/store/sidebarStore";

/**
 * Dummy thread history panel — shows thread list, no navigation.
 * Reuses threadGroups from sidebarStore.
 */
export default function ThreadHistoryPanel() {
  const { goBack } = useExplorePanelStore();
  const { threadGroups, fetchThreads } = useSidebarStore();

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  const sections = [
    { label: "Today", threads: threadGroups.today },
    { label: "Previous 7 days", threads: threadGroups.previousWeek },
    { label: "Older", threads: threadGroups.older },
  ].filter((s) => s.threads.length > 0);

  const hasThreads = sections.length > 0;

  return (
    <Flex flexDir="column" h="100%" w="100%">
      {/* Header */}
      <Flex
        alignItems="center"
        gap={2}
        px={3}
        py={2}
        h="14"
        flexShrink={0}
        borderBottom="1px solid"
        borderColor="border.muted"
      >
        <IconButton
          size="sm"
          variant="ghost"
          color="fg.muted"
          onClick={goBack}
          aria-label="Back"
        >
          <ArrowLeftIcon />
        </IconButton>
        <Heading size="sm" fontWeight="semibold" m={0}>
          Chat History
        </Heading>
      </Flex>

      {/* Thread list */}
      <Box flex={1} overflowY="auto" py={2}>
        {!hasThreads ? (
          <Text color="fg.muted" fontSize="sm" px={4} py={4}>
            No conversations yet.
          </Text>
        ) : (
          <Accordion.Root
            multiple
            defaultValue={sections.map((s) => s.label)}
          >
            {sections.map((section) => (
              <Accordion.Item
                key={section.label}
                value={section.label}
                border="none"
              >
                <Accordion.ItemTrigger px={4} py={1} cursor="pointer">
                  <Text
                    fontSize="xs"
                    fontWeight="normal"
                    color="fg.subtle"
                    mr="auto"
                  >
                    {section.label}
                  </Text>
                  <Accordion.ItemIndicator />
                </Accordion.ItemTrigger>
                <Accordion.ItemContent px={0} pt={0}>
                  <Stack gap={1} mt={1}>
                    {section.threads.map((thread) => (
                      <Flex
                        key={thread.id}
                        align="center"
                        px={4}
                        py={1.5}
                        mx={2}
                        borderRadius="sm"
                        _hover={{ layerStyle: "fill.muted" }}
                        cursor="default"
                      >
                        <Text
                          fontSize="sm"
                          whiteSpace="nowrap"
                          overflow="hidden"
                          textOverflow="ellipsis"
                        >
                          {thread.name}
                        </Text>
                      </Flex>
                    ))}
                  </Stack>
                </Accordion.ItemContent>
              </Accordion.Item>
            ))}
          </Accordion.Root>
        )}
      </Box>
    </Flex>
  );
}
