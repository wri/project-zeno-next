"use client";
import type { ReactNode } from "react";
import { Box, Text } from "@chakra-ui/react";
import { InfoIcon } from "@phosphor-icons/react";

import { Tooltip } from "@/app/components/ui/tooltip";

/**
 * The info icon that opens a dark tooltip, shared by the curated chart titles
 * and the DETAIL/MEASURE pills so glyph, size, colour, delay and placement are
 * decided once. The body is mounted only while open — it is a handful of
 * styled nodes per tooltip and there are several per card.
 */
export function InfoTooltip({ children }: { children: ReactNode }) {
  return (
    <Tooltip
      content={children}
      variant="dark"
      showArrow
      openDelay={200}
      positioning={{ placement: "bottom" }}
      lazyMount
      unmountOnExit
    >
      <Box as="span" display="inline-flex" cursor="pointer" flexShrink={0}>
        <InfoIcon size={16} color="#737C94" />
      </Box>
    </Tooltip>
  );
}

/** The bold heading that opens an info tooltip's body. */
export function InfoTitle({ children }: { children: ReactNode }) {
  return (
    <Text fontWeight="bold" mb="4px">
      {children}
    </Text>
  );
}

/** One "Term: description" row of an info tooltip; rows space themselves. */
export function InfoDefinition({
  term,
  children,
}: {
  term: string;
  children: ReactNode;
}) {
  return (
    <Text _notLast={{ mb: "8px" }}>
      <Text as="span" fontWeight="bold">
        {term}:
      </Text>{" "}
      {children}
    </Text>
  );
}
