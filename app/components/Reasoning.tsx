"use client";
import { Box, Collapsible, Flex, Text, Spinner } from "@chakra-ui/react";
import { CaretDownIcon, CaretRightIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { ToolStepData } from "@/app/types/chat";

// Helper function to format tool names for display
function formatToolName(toolName: string): string {
  const toolNameMap: Record<string, string> = {
    generate_insights: "Generating insights",
    pick_aoi: "Picking area of interest",
    pick_dataset: "Selecting dataset",
    pull_data: "Pulling data",
  };

  return toolNameMap[toolName] || `Processing ${toolName}`;
}

interface ReasoningProps {
  toolSteps: ToolStepData[];
  isLoading: boolean;
}

function Reasoning({ toolSteps, isLoading }: ReasoningProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Get current tool name for dynamic status
  const currentTool = toolSteps.length > 0 ? toolSteps[toolSteps.length - 1] : null;

  // While loading, show spinner with dynamic status
  if (isLoading) {
    return (
      <Flex justifyContent="flex-start" alignItems="center" gap="3" mb={4}>
        <Spinner size="sm" color="fg.muted" />
        <Text fontSize="sm" color="fg.muted">
          {currentTool ? formatToolName(currentTool.name) : "Processing request..."}
        </Text>
      </Flex>
    );
  }

  // After completion, show collapsible reasoning with tool cards
  if (!isLoading && toolSteps.length > 0) {
    return (
      <Collapsible.Root open={isOpen} onOpenChange={(e) => setIsOpen(e.open)}>
        <Collapsible.Trigger>
          <Flex
            justifyContent="flex-start"
            alignItems="center"
            gap="2"
            mb={4}
            cursor="pointer"
            _hover={{ opacity: 0.8 }}
          >
            <Text fontSize="sm" color="fg.muted">
              Show Reasoning
            </Text>
            {isOpen ? (
              <CaretDownIcon size={16} color="var(--chakra-colors-fg-muted)" />
            ) : (
              <CaretRightIcon size={16} color="var(--chakra-colors-fg-muted)" />
            )}
          </Flex>
        </Collapsible.Trigger>
        <Collapsible.Content>
          <Box mb={4}>
            {toolSteps.map((tool, index) => (
              <Box
                key={`${tool.name}-${index}`}
                bg="bg.muted"
                borderRadius="md"
                padding={4}
                marginBottom={3}
              >
                <Text fontWeight="bold" mb={2} fontSize="sm">
                  {formatToolName(tool.name)}
                </Text>
                <Box
                  as="pre"
                  fontSize="xs"
                  fontFamily="mono"
                  overflow="auto"
                  maxHeight="300px"
                  bg="bg.surface"
                  padding={3}
                  borderRadius="sm"
                  whiteSpace="pre-wrap"
                  wordBreak="break-word"
                >
                  {JSON.stringify(tool, null, 2)}
                </Box>
              </Box>
            ))}
          </Box>
        </Collapsible.Content>
      </Collapsible.Root>
    );
  }

  // If not loading and no tool steps, don't render anything
  return null;
}

export default Reasoning;
