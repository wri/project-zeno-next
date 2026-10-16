import { Stack, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";

import { CATALOG_CARD_WIDTH_PX } from "@/app/explorationLayout";

/**
 * A column of cards at the exploration panels' card width, so the cards
 * themselves have none. Panels still on `CatalogCard` wrap their own until
 * they migrate.
 */
export function PanelList({ children }: { children: ReactNode }) {
  return (
    <Stack
      gap="6px"
      w={`${CATALOG_CARD_WIDTH_PX}px`}
      maxW="100%"
      flexShrink={0}
    >
      {children}
    </Stack>
  );
}

/** The muted message a panel shows instead of an empty list. */
export function PanelEmpty({ children }: { children: ReactNode }) {
  return (
    <Text fontSize="sm" color="fg.muted" mt={4}>
      {children}
    </Text>
  );
}

/** A labelled group of rows ("On map", "All datasets"); a landmark region. */
export function PanelSection({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <Stack as="section" aria-label={label} gap="6px" flexShrink={0}>
      <Text
        fontFamily="mono"
        fontSize="10px"
        lineHeight="16px"
        letterSpacing="0.03em"
        textTransform="uppercase"
        color="#656E7B"
      >
        {label}
      </Text>
      {children}
    </Stack>
  );
}
