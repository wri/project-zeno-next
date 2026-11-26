import { Component, Suspense, type ReactNode } from "react";
import { Button, Stack, Text } from "@chakra-ui/react";
import { QueryErrorResetBoundary } from "@tanstack/react-query";

/**
 * Load the user's areas within one part of the page: `loading` while they
 * load, and a retry when they fail. Without it a failed load reaches the
 * route's error screen and replaces the whole page.
 */
export function UserAoisBoundary({
  loading,
  children,
}: {
  loading: ReactNode;
  children: ReactNode;
}) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <LoadErrorBoundary onRetry={reset}>
          <Suspense fallback={loading}>{children}</Suspense>
        </LoadErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}

class LoadErrorBoundary extends Component<
  { onRetry: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  retry = () => {
    this.props.onRetry();
    this.setState({ failed: false });
  };

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <Stack gap={2} align="flex-start" color="fg.muted" fontSize="sm">
        <Text>Couldn&apos;t load your areas.</Text>
        <Button size="xs" variant="outline" onClick={this.retry}>
          Retry
        </Button>
      </Stack>
    );
  }
}
