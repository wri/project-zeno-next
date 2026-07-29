"use client";

import { ReactNode, useState } from "react";
import { Box, Flex, Text } from "@chakra-ui/react";
import { CaretDownIcon, CaretRightIcon, InfoIcon } from "@phosphor-icons/react";

interface InfoCalloutProps {
  readonly title: string;
  readonly children: ReactNode;
  /** Collapsible with a closed default keeps dense pages scannable. */
  readonly collapsible?: boolean;
  readonly defaultOpen?: boolean;
}

/**
 * Explanatory info block — the standard way to tell users what a metric or
 * section means. Renders in the GNW info style (pale blue, filled info icon).
 */
export function InfoCallout({
  title,
  children,
  collapsible = true,
  defaultOpen = false,
}: InfoCalloutProps) {
  const [open, setOpen] = useState(defaultOpen || !collapsible);
  const showBody = !collapsible || open;

  return (
    <Box
      bg="bg.info"
      borderWidth="1px"
      borderColor="border.info"
      borderRadius="sm"
      px={3}
      py={collapsible ? 1.5 : 2.5}
    >
      {collapsible ? (
        <Flex
          as="button"
          align="center"
          gap={2}
          width="100%"
          py={1}
          cursor="pointer"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
        >
          <InfoIcon
            size={14}
            weight="fill"
            color="var(--chakra-colors-primary-400)"
          />
          <Text
            fontSize="xs"
            fontWeight="medium"
            color="primary.fg"
            textAlign="left"
            flex="1"
          >
            {title}
          </Text>
          {open ? (
            <CaretDownIcon size={12} color="var(--chakra-colors-neutral-500)" />
          ) : (
            <CaretRightIcon
              size={12}
              color="var(--chakra-colors-neutral-500)"
            />
          )}
        </Flex>
      ) : (
        <Flex align="center" gap={2} mb={1}>
          <InfoIcon
            size={14}
            weight="fill"
            color="var(--chakra-colors-primary-400)"
          />
          <Text fontSize="xs" fontWeight="medium" color="primary.fg">
            {title}
          </Text>
        </Flex>
      )}
      {showBody ? (
        <Box
          fontSize="sm"
          color="fg.muted"
          pt={collapsible ? 1 : 0}
          pb={1}
          pl={collapsible ? "22px" : "22px"}
        >
          {children}
        </Box>
      ) : null}
    </Box>
  );
}
