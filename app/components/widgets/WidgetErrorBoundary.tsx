"use client";
import { Component, type ReactNode } from "react";
import { Box, Flex, Text } from "@chakra-ui/react";
import { WarningIcon } from "@phosphor-icons/react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class WidgetErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Widget rendering error:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box
          p={4}
          border="1px solid"
          borderColor="border.error"
          borderRadius="md"
          bg="bg.error"
        >
          <Flex align="center" gap={2} mb={1}>
            <WarningIcon weight="fill" />
            <Text fontSize="sm" fontWeight="medium">
              {this.props.fallbackTitle ?? "Unable to render visualization"}
            </Text>
          </Flex>
          <Text fontSize="xs" color="fg.muted">
            Something went wrong while displaying this content. The data may be
            in an unexpected format.
          </Text>
        </Box>
      );
    }

    return this.props.children;
  }
}
