"use client";

import { Button, Flex, type FlexProps } from "@chakra-ui/react";

/** The list with `code` added, or removed when already there. */
export function toggleTopic(topics: string[], code: string): string[] {
  return topics.includes(code)
    ? topics.filter((t) => t !== code)
    : [...topics, code];
}

interface TopicPillsProps extends Omit<FlexProps, "onToggle"> {
  /** Topic code → label, from GET /api/profile/config. */
  topics: Record<string, string> | undefined;
  selected: string[];
  onToggle: (code: string) => void;
}

/**
 * The profile's topics as toggle pills, shared by onboarding, User Profile
 * and the in-chat profile card. Flex props go on the wrapper.
 */
export function TopicPills({
  topics,
  selected,
  onToggle,
  ...flexProps
}: TopicPillsProps) {
  return (
    <Flex gap={2} wrap="wrap" {...flexProps}>
      {Object.entries(topics ?? {}).map(([code, label]) => {
        const isSelected = selected.includes(code);
        return (
          <Button
            key={code}
            size="xs"
            h={6}
            rounded="full"
            colorPalette={isSelected ? "primary" : undefined}
            variant={isSelected ? "solid" : "outline"}
            bg={isSelected ? undefined : "bg"}
            aria-pressed={isSelected}
            onClick={() => onToggle(code)}
          >
            {label}
          </Button>
        );
      })}
    </Flex>
  );
}
