"use client";

import { Box } from "@chakra-ui/react";

interface JsonBlockProps {
  readonly value: unknown;
  readonly maxHeight?: string;
}

/** Pretty-printed JSON in a scrollable monospace block. */
export function JsonBlock({ value, maxHeight = "400px" }: JsonBlockProps) {
  let text: string;
  try {
    text = JSON.stringify(value, null, 2) ?? "null";
  } catch {
    text = String(value);
  }
  return (
    <Box
      as="pre"
      fontFamily="mono"
      fontSize="xs"
      bg="bg.subtle"
      borderRadius="md"
      p={3}
      overflow="auto"
      maxH={maxHeight}
      whiteSpace="pre-wrap"
      wordBreak="break-word"
    >
      {text}
    </Box>
  );
}
