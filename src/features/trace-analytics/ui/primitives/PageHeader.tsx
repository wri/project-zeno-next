"use client";

import { ReactNode } from "react";
import { Box, Flex, Heading, Text } from "@chakra-ui/react";

interface PageHeaderProps {
  /** Mono uppercase eyebrow, e.g. "Zeno API · per-turn aggregates". */
  readonly eyebrow: string;
  readonly title: string;
  readonly description: ReactNode;
  /** Optional right-aligned actions. */
  readonly actions?: ReactNode;
}

/** Consistent page intro: eyebrow, title, one-paragraph description. */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <Flex align="flex-start" justify="space-between" gap={4} wrap="wrap">
      <Box maxW="3xl">
        <Text
          fontSize="2xs"
          fontFamily="mono"
          textTransform="uppercase"
          letterSpacing="0.08em"
          color="fg.subtle"
          mb={1}
        >
          {eyebrow}
        </Text>
        <Heading size="lg" lineHeight="shorter">
          {title}
        </Heading>
        <Text color="fg.muted" fontSize="sm" mt={1}>
          {description}
        </Text>
      </Box>
      {actions ? <Box flexShrink={0}>{actions}</Box> : null}
    </Flex>
  );
}
