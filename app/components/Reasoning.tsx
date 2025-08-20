"use client";
import { Box, Collapsible, Flex, Text, Spinner } from "@chakra-ui/react";
import { CaretDownIcon, CaretRightIcon } from "@phosphor-icons/react";
import { useState } from "react";
import useChatStore from "@/app/store/chatStore";

// Helper function to format tool names for display
function formatToolName(toolName: string): string {
  const toolNameMap: Record<string, string> = {
    generate_insights: "Generating insights",
    "pick-aoi": "Picking area of interest",
    "pick-dataset": "Selecting dataset",
    "pull-data": "Pulling data",
  };

  return toolNameMap[toolName] || `Processing ${toolName}`;
}

function Reasoning() {
  const [isOpen, setIsOpen] = useState(false);
  const { toolSteps } = useChatStore();
  return (
    <Collapsible.Root open={isOpen} onOpenChange={(e) => setIsOpen(e.open)}>
      <Collapsible.Trigger>
        <Flex justifyContent="flex-start" alignItems="center" gap="3" mb={4}>
          <Spinner size="sm" color="fg.muted" />
          <Text fontSize="sm" color="fg.muted">
            Reasoning
          </Text>
          {isOpen ? <CaretDownIcon /> : <CaretRightIcon />}
        </Flex>
      </Collapsible.Trigger>
      <Collapsible.Content>
        <Box
          bg="bg.muted"
          borderRadius="sm"
          paddingTop="8px"
          paddingBottom="8px"
          paddingLeft={3}
          paddingRight={3}
          gap={2}
          fontFamily="mono"
          fontSize="xs"
        >
          {toolSteps.length === 0 ? (
            <Text color="fg.muted">Processing request...</Text>
          ) : (
            toolSteps.map((toolName, index) => (
              <Text key={`${toolName}-${index}`} color="fg.muted" mb={1}>
                • {formatToolName(toolName)}
              </Text>
            ))
          )}
        </Box>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}

export default Reasoning;
