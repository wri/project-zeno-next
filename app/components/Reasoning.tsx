"use client";
import {
  Box,
  Collapsible,
  Flex,
  Heading,
  Separator,
  Text,
  Timeline,
} from "@chakra-ui/react";

import {
  CaretDownIcon,
  CaretRightIcon,
  SpinnerGapIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import { ToolStepData } from "@/app/types/chat";
import Markdown from "react-markdown";
import remarkBreaks from "remark-breaks";

// Strip leading whitespace from each line so indented template literals
// in the API response don't get treated as Markdown code blocks (4+ spaces)
function trimLines(content: string): string {
  return content
    .split("\n")
    .map((l) => l.trimStart())
    .join("\n");
}

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
  reasoningDuration?: number;
}

function Reasoning({
  toolSteps,
  isLoading,
  reasoningDuration,
}: ReasoningProps) {
  const [isOpen, setIsOpen] = useState(false);
  console.log(toolSteps);

  // Get current tool name for dynamic status
  const currentTool =
    toolSteps.length > 0 ? toolSteps[toolSteps.length - 1] : null;

  // While loading, show shimmer with dynamic status
  if (isLoading) {
    return (
      <Flex
        justifyContent="flex-start"
        alignItems="center"
        gap="2"
        mb={4}
        p={2}
        px={3}
      >
        {isLoading && (
          <Box
            animation="spin 1s infinite"
            animationTimingFunction="steps(8, end)"
          >
            <SpinnerGapIcon size={16} color="var(--chakra-colors-fg-muted)" />
          </Box>
        )}
        <Text
          fontSize="xs"
          color="fg.muted"
          animation={isLoading ? "shimmer" : "none"}
          background={`linear-gradient(
          120deg,
          rgba(131, 131, 131, 0.5) 0%,
          rgba(0, 0, 0, 0.5) 50%,
          rgba(131, 131, 131, 0.5) 100%
        )`}
          backgroundSize="200% 100%"
          backgroundClip="text"
        >
          {currentTool
            ? formatToolName(currentTool.name)
            : "Processing request..."}
        </Text>
      </Flex>
    );
  }

  // After completion, show collapsible reasoning with tool cards
  if (!isLoading && toolSteps.length > 0) {
    return (
      <Collapsible.Root
        open={isOpen}
        onOpenChange={(e) => setIsOpen(e.open)}
        mb={4}
        p={2}
        px={3}
      >
        <Collapsible.Trigger w="full">
          <Flex
            justifyContent="flex-start"
            alignItems="center"
            gap="2"
            mb={isOpen ? 4 : 0}
            pb={isOpen ? 2 : 0}
            borderBottom={isOpen ? "1px solid" : "none"}
            borderColor="border.emphasized"
            cursor="pointer"
            _hover={{ opacity: 0.8 }}
          >
            <Text fontSize="xs" color="fg.muted">
              Reasoned for {reasoningDuration?.toFixed(1) || "0.0"}s
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
            <Timeline.Root size="sm" variant="subtle" showLastSeparator={true}>
              {toolSteps.map((tool, index) => (
                <Timeline.Item key={`${tool.name}-${index}`}>
                  <Timeline.Connector>
                    <Timeline.Separator />
                    <Timeline.Indicator boxSize="8px" top={1} left={1} />
                  </Timeline.Connector>
                  <Timeline.Content>
                    <Timeline.Title>{formatToolName(tool.name)}</Timeline.Title>
                    <Box fontSize="xs" maxW="100%">
                      <Markdown
                        remarkPlugins={[remarkBreaks]}
                        components={{
                          h1: ({ ...props }) => (
                            <>
                              <Separator my={2} borderColor="neutral.300" />
                              <Heading as="h1" size="sm" mb={2} {...props} />
                            </>
                          ),
                          h2: ({ ...props }) => (
                            <>
                              <Separator my={2} borderColor="neutral.300" />
                              <Heading as="h2" size="xs" mb={2} {...props} />
                            </>
                          ),
                          h3: ({ ...props }) => (
                            <>
                              <Separator my={2} borderColor="neutral.300" />
                              <Heading as="h3" size="xs" mb={2} {...props} />
                            </>
                          ),
                          p: ({ node: _, ...props }) => <Box mb={2} {...props} />,
                          br: () => <Box h={2} />,
                        }}
                      >
                        {tool.content ? trimLines(tool.content) : ""}
                      </Markdown>
                    </Box>
                  </Timeline.Content>
                </Timeline.Item>
              ))}
            </Timeline.Root>
          </Box>
        </Collapsible.Content>
      </Collapsible.Root>
    );
  }

  // If not loading and no tool steps, don't render anything
  return null;
}

export default Reasoning;
