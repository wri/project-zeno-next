"use client";
import { Box, Collapsible, Flex, Text, Spinner } from "@chakra-ui/react";

function Reasoning() {
  return (
    <Collapsible.Root>
      <Collapsible.Trigger>
        <Flex justifyContent="flex-start" alignItems="center" gap="3" mb={4}>
          <Spinner size="sm" color="fg.muted" />
          <Text fontSize="sm" color="fg.muted">
            Reasoning
          </Text>
        </Flex>
      </Collapsible.Trigger>
      <Collapsible.Content>
        <Box
          bg="gray.200"
          borderRadius="sm"
          paddingTop="8px"
          paddingBottom="8px"
          paddingLeft={3}
          paddingRight={3}
          gap={2}
        >
          Placeholder text for reasoning steps.
        </Box>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}

export default Reasoning;
