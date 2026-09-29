"use client";

import { useState } from "react";
import { Box, Flex, Text, chakra } from "@chakra-ui/react";
import { InfoIcon } from "@phosphor-icons/react";

import { Tooltip } from "./ui/tooltip";
import { usePromptQuota } from "../hooks/usePromptQuota";

// Semantics/Error/500 in the design (GlobalHeader - Phase 6).
const METER_FILL = "#C11101";
const METER_TRACK = "#E0E2E5";

/**
 * Header warning that the user is close to today's prompt limit: "X / Y daily
 * prompts", an info icon explaining the limit and a red usage bar.
 * Self-guarding: renders nothing below 75% usage. Reads the auth store
 * reactively, so the count and bar follow each prompt without a reload.
 */
function PromptQuotaMeter() {
  const { usedPrompts, totalPrompts, showPromptMeter } = usePromptQuota();
  // Controlled so a click (touch devices, keyboard users) opens the
  // explanation as well as hover; the default tooltip closes on click.
  const [infoOpen, setInfoOpen] = useState(false);

  if (!showPromptMeter) return null;

  const percent = Math.min(100, (usedPrompts / totalPrompts) * 100);

  return (
    <Flex
      direction="column"
      gap="1"
      w="127px"
      flexShrink={0}
      data-testid="prompt-quota-meter"
    >
      <Flex align="center" justify="space-between" gap="1">
        <Text
          fontSize="xs"
          lineHeight="1.5"
          whiteSpace="nowrap"
          color="#656E7B"
        >
          {usedPrompts} / {totalPrompts} daily prompts
        </Text>
        <Tooltip
          open={infoOpen}
          onOpenChange={(e) => setInfoOpen(e.open)}
          closeOnClick={false}
          content={`You can send up to ${totalPrompts} prompts a day and have used ${usedPrompts}. Your prompts refresh every 24 hours.`}
          showArrow
        >
          <chakra.button
            type="button"
            aria-label="How the daily prompt limit works"
            display="inline-flex"
            color="#656E7B"
            cursor="help"
            borderRadius="sm"
            _focusVisible={{
              outline: "2px solid",
              outlineColor: "neutral.600",
              outlineOffset: "2px",
            }}
            onClick={() => setInfoOpen(true)}
          >
            <InfoIcon size={12} />
          </chakra.button>
        </Tooltip>
      </Flex>
      <Box
        role="progressbar"
        aria-label="Daily prompts used"
        aria-valuemin={0}
        aria-valuemax={totalPrompts}
        aria-valuenow={usedPrompts}
        h="4px"
        bg={METER_TRACK}
        rounded="full"
        overflow="hidden"
      >
        <Box h="full" w={`${percent}%`} bg={METER_FILL} rounded="full" />
      </Box>
    </Flex>
  );
}

export default PromptQuotaMeter;
