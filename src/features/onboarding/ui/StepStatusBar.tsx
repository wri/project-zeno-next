"use client";

import { Box, Flex, Text } from "@chakra-ui/react";
import {
  ChatCircleDotsIcon,
  CheckCircleIcon,
  CircleNotchIcon,
  HandPointingIcon,
  HourglassIcon,
  ProhibitIcon,
  SkipForwardIcon,
  WarningCircleIcon,
  type Icon,
  type IconWeight,
} from "@phosphor-icons/react";

import type { StepStatusTone } from "../model/step-policy";

/** A step's status, or the note that the tour skipped a step. */
export type StatusBarTone = Exclude<StepStatusTone, "none"> | "skipped";

/** The words a status bar shows, and how it looks. */
export interface StatusLine {
  readonly tone: StatusBarTone;
  readonly text: string;
}

interface Look {
  /** A colour palette with `subtle`, `muted` and `fg` tokens. */
  readonly palette: string;
  readonly icon: Icon;
  readonly weight?: IconWeight;
  readonly spin?: boolean;
}

const LOOKS: Record<StatusBarTone, Look> = {
  turn: { palette: "secondary", icon: HandPointingIcon },
  wait: { palette: "primary", icon: CircleNotchIcon, spin: true },
  slow: { palette: "orange", icon: HourglassIcon },
  done: { palette: "green", icon: CheckCircleIcon, weight: "fill" },
  failed: { palette: "red", icon: WarningCircleIcon, weight: "fill" },
  asked: { palette: "primary", icon: ChatCircleDotsIcon },
  blocked: { palette: "gray", icon: ProhibitIcon },
  skipped: { palette: "gray", icon: SkipForwardIcon },
};

const SPIN_CSS = {
  animation: "spin 1s linear infinite",
  "@media (prefers-reduced-motion: reduce)": { animation: "none" },
};

/**
 * One line of status in the popover footer: an icon and words in the tone's
 * colours, so the state never rests on colour alone. Not a live region: the
 * overlay announces status changes in its own.
 */
export function StepStatusBar({ tone, text }: StatusLine) {
  const { palette, icon: StatusIcon, weight, spin } = LOOKS[tone];
  return (
    <Flex
      align="flex-start"
      gap="2"
      px="2.5"
      py="1.5"
      rounded="md"
      borderWidth="1px"
      colorPalette={palette}
      bg="colorPalette.subtle"
      borderColor="colorPalette.muted"
      color="colorPalette.fg"
      fontSize="xs"
      lineHeight="1.45"
      data-status={tone}
    >
      <Box
        as="span"
        display="inline-flex"
        flexShrink={0}
        mt="1px"
        fontSize="14px"
        css={spin ? SPIN_CSS : undefined}
        aria-hidden
      >
        <StatusIcon weight={weight} />
      </Box>
      <Text fontWeight="medium">{text}</Text>
    </Flex>
  );
}
