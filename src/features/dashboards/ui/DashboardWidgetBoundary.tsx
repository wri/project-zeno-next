"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button, Flex, Text } from "@chakra-ui/react";
import { WarningCircleIcon } from "@phosphor-icons/react";

/**
 * Keeps one failing widget from taking the dashboard down with it.
 *
 * A dashboard is a page of independent widgets, several of which own a live
 * MapLibre instance. MapLibre throws from its own render loop when a map is
 * torn down while a frame or a tile is still in flight — a reorder, a section
 * move, or a dev-server hot reload can all trigger that — and an unguarded
 * throw in a layout effect unmounts the whole route. One broken card is a far
 * better failure than a blank dashboard.
 *
 * `resetKey` clears the error when the widget's own content changes, so a card
 * that failed once is retried on the next edit rather than staying broken for
 * the life of the page.
 */
export default class DashboardWidgetBoundary extends Component<
  { children: ReactNode; resetKey?: string },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidUpdate(previous: { resetKey?: string }) {
    if (this.state.failed && previous.resetKey !== this.props.resetKey) {
      this.setState({ failed: false });
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Dashboard widget failed to render", error, info);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <Flex
        direction="column"
        align="center"
        justify="center"
        gap={2}
        minH="120px"
        px={6}
        textAlign="center"
        bg="#F7F9FF"
        borderWidth="1px"
        borderColor="#DDE2F5"
        borderRadius="sm"
        color="fg.muted"
      >
        <WarningCircleIcon size={24} />
        <Text fontSize="sm">This widget could not be displayed.</Text>
        <Button
          size="xs"
          variant="outline"
          onClick={() => this.setState({ failed: false })}
        >
          Try again
        </Button>
      </Flex>
    );
  }
}
