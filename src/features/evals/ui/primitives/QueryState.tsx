"use client";

import { Center, Spinner, Text, VStack } from "@chakra-ui/react";
import { InlineAlert } from "./InlineAlert";

/** Shared loading/error rendering for the data queries; renders null when
 * the query has data (the caller then renders the real content). */
export function QueryState({
  isLoading,
  error,
  what,
}: {
  readonly isLoading: boolean;
  readonly error: Error | null;
  readonly what: string;
}) {
  if (isLoading) {
    return (
      <Center py={12}>
        <VStack gap={2}>
          <Spinner size="sm" />
          <Text fontSize="sm" color="fg.subtle">
            Loading {what}…
          </Text>
        </VStack>
      </Center>
    );
  }
  if (error) {
    return (
      <InlineAlert
        status="error"
        title={`Could not load ${what}`}
        message={error.message}
      />
    );
  }
  return null;
}
