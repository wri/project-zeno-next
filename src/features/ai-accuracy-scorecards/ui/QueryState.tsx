import { Alert, Center, Spinner, Text, VStack } from "@chakra-ui/react";

/** Loading and error rendering for the page's queries; null once loaded. */
export function QueryState({
  isLoading,
  error,
}: {
  readonly isLoading: boolean;
  readonly error: Error | null;
}) {
  if (error) {
    return (
      <Alert.Root status="error" borderRadius="md" my={6}>
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>Could not load the benchmark results</Alert.Title>
          <Alert.Description whiteSpace="pre-wrap">
            {error.message}
          </Alert.Description>
        </Alert.Content>
      </Alert.Root>
    );
  }
  if (isLoading) {
    return (
      <Center py={16}>
        <VStack gap={2}>
          <Spinner size="sm" />
          <Text fontSize="sm" color="fg.subtle">
            Loading the benchmark results…
          </Text>
        </VStack>
      </Center>
    );
  }
  return null;
}
