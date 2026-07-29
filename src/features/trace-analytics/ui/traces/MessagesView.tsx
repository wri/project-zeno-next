"use client";

import { Flex, Text } from "@chakra-ui/react";
import type { AgentMessage } from "../../model/types";
import { contentText, messageType, stripNoise } from "../../lib/parsing";
import { Expander } from "../primitives/Expander";
import { JsonBlock } from "./JsonBlock";

interface MessagesViewProps {
  readonly messages: readonly AgentMessage[];
  /** Absolute index of the first message (labels stay aligned with the raw list). */
  readonly indexOffset: number;
  readonly hideEmpty: boolean;
  readonly emptyMessage: string;
}

/** Expandable list of AgentState output messages. */
export function MessagesView({
  messages,
  indexOffset,
  hideEmpty,
  emptyMessage,
}: MessagesViewProps) {
  const visible = messages
    .map((message, i) => {
      const type = messageType(message);
      const text = contentText(message.content);
      return { message, index: indexOffset + i, type, text };
    })
    .filter(({ type, text }) => {
      if (!hideEmpty) return true;
      return Boolean(text.trim()) || type === "ai" || type === "tool";
    });

  if (!visible.length) {
    return (
      <Text fontSize="sm" color="fg.muted">
        {emptyMessage}
      </Text>
    );
  }

  return (
    <Flex direction="column" gap={2}>
      {visible.map(({ message, index, type, text }) => {
        const name = String(message.name ?? "");
        const label = `${index}: ${type || "message"}${name ? ` (${name})` : ""}`;
        return (
          <Expander key={index} title={label}>
            <Flex direction="column" gap={2}>
              {text.trim() ? (
                <Text
                  as="pre"
                  fontFamily="mono"
                  fontSize="xs"
                  bg="bg.subtle"
                  borderRadius="md"
                  p={3}
                  overflow="auto"
                  maxH="240px"
                  whiteSpace="pre-wrap"
                >
                  {text}
                </Text>
              ) : null}
              <JsonBlock value={stripNoise(message)} maxHeight="240px" />
            </Flex>
          </Expander>
        );
      })}
    </Flex>
  );
}
