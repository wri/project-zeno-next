import { Button, Stack, Text, Wrap } from "@chakra-ui/react";
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

/** A labelled group of rows ("My areas", "Places"); a landmark region. */
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

/** The single-select pill row a panel filters its list with. */
export function PanelPills<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <Wrap gap={1} flexShrink={0} overflow="hidden">
      {options.map((option) => {
        const isActive = value === option.id;
        return (
          <Button
            key={option.id}
            aria-pressed={isActive}
            h="24px"
            minH="24px"
            py="4px"
            px="8px"
            borderRadius="full"
            fontSize="12px"
            fontWeight="400"
            lineHeight="16px"
            bg={isActive ? "fg.link" : "neutral.300"}
            color={isActive ? "white" : "fg"}
            border="1px solid"
            borderColor={isActive ? "fg.link" : "neutral.300"}
            _hover={{
              bg: isActive ? "fg.link" : "neutral.400",
            }}
            onClick={() => onChange(option.id)}
          >
            {option.label}
          </Button>
        );
      })}
    </Wrap>
  );
}
