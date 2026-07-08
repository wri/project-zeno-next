"use client";

import { Badge, Box, Flex, Text } from "@chakra-ui/react";
import type { ToolCallView } from "../../lib/parsing";
import { stripNoise } from "../../lib/parsing";
import { Expander } from "../primitives/Expander";
import { JsonBlock } from "./JsonBlock";

interface ToolCallsViewProps {
  readonly calls: readonly ToolCallView[];
  readonly emptyMessage: string;
}

/** Expandable list of tool calls paired with their results. */
export function ToolCallsView({ calls, emptyMessage }: ToolCallsViewProps) {
  if (!calls.length) {
    return (
      <Text fontSize="sm" color="fg.muted">
        {emptyMessage}
      </Text>
    );
  }

  return (
    <Flex direction="column" gap={2}>
      {calls.map((call) => (
        <Expander
          key={`${call.index}-${call.callId}`}
          title={`${call.index}. ${call.name || "(unnamed tool)"}${call.resultStatus ? ` (${call.resultStatus})` : ""}`}
        >
          <Flex direction="column" gap={2}>
            <Box>
              <Text fontSize="xs" fontWeight="semibold" mb={1}>
                Call{" "}
                {call.callId ? (
                  <Badge fontFamily="mono" fontSize="2xs" ml={1}>
                    {call.callId}
                  </Badge>
                ) : null}
              </Text>
              <JsonBlock
                value={stripNoise({ name: call.name, args: call.args })}
                maxHeight="240px"
              />
            </Box>
            <Box>
              <Text fontSize="xs" fontWeight="semibold" mb={1}>
                Result
              </Text>
              {call.result ? (
                <Flex direction="column" gap={2}>
                  {call.resultText.trim() ? (
                    <Box
                      as="pre"
                      fontFamily="mono"
                      fontSize="xs"
                      bg="bg.subtle"
                      borderRadius="md"
                      p={3}
                      overflow="auto"
                      maxH="200px"
                      whiteSpace="pre-wrap"
                    >
                      {call.resultText}
                    </Box>
                  ) : null}
                  <JsonBlock
                    value={stripNoise(call.result)}
                    maxHeight="240px"
                  />
                </Flex>
              ) : (
                <Text fontSize="sm" color="fg.muted">
                  No tool result message found for this tool_call_id
                </Text>
              )}
            </Box>
          </Flex>
        </Expander>
      ))}
    </Flex>
  );
}
