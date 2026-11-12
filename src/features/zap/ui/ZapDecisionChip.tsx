"use client";
import { Box, Flex, Stack, Text } from "@chakra-ui/react";
import { CaretDownIcon } from "@phosphor-icons/react";
import { useState } from "react";

import type { ZapDecision, ZapDecisionOption } from "../model/zap-plan";

const percent = (p: number) => `${Math.round(p * 100)}%`;

/**
 * One decision of the plan: the question, the selected value, its source
 * and its probability. When the decision carries other options, a click
 * opens them; `onSelect` gets the selected one (the panel sends it as a new
 * request, which adds a new row to the trail). `defaultOpen` shows the
 * options at once, e.g. for a decision that is not clear.
 */
export function ZapDecisionChip({
  decision,
  busy,
  onSelect,
  defaultOpen = false,
}: {
  decision: ZapDecision;
  busy: boolean;
  onSelect: (option: ZapDecisionOption) => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const options = decision.options ?? [];
  const hasOptions = options.length > 0;

  return (
    <Stack gap={0.5}>
      <Flex
        as={hasOptions ? "button" : "div"}
        onClick={hasOptions ? () => setOpen((o) => !o) : undefined}
        aria-expanded={hasOptions ? open : undefined}
        gap={2}
        align="center"
        textAlign="left"
        cursor={hasOptions ? "pointer" : undefined}
      >
        <Text w="20" flexShrink={0}>
          {decision.question}
        </Text>
        <Text truncate flex="1">
          {decision.label}
        </Text>
        {hasOptions && <CaretDownIcon size={10} />}
        {decision.source && (
          <Text fontSize="2xs" color="fg.subtle" title="Source of the value">
            {decision.source}
          </Text>
        )}
        <Text>{percent(decision.probability)}</Text>
      </Flex>
      {open && (
        <Flex gap={1} wrap="wrap" pl={20}>
          {options.map((option) => (
            <Box
              as="button"
              key={option.label}
              aria-disabled={busy}
              onClick={() => {
                if (busy) return;
                setOpen(false);
                onSelect(option);
              }}
              px={2}
              rounded="full"
              borderWidth="1px"
              borderColor="border.emphasized"
              color="fg"
              cursor={busy ? "default" : "pointer"}
              _hover={busy ? undefined : { borderColor: "primary.solid" }}
            >
              {option.label} {percent(option.probability)}
            </Box>
          ))}
        </Flex>
      )}
    </Stack>
  );
}
