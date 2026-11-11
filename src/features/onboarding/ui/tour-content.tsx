"use client";

import { Box, Flex, Grid, Text } from "@chakra-ui/react";
import {
  CalendarBlankIcon,
  MapPinIcon,
  StackSimpleIcon,
  type Icon,
  type IconWeight,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";

import { hasLimitedQuota, usePromptQuota } from "@/app/hooks/usePromptQuota";

import { SKIP_STEP_LABEL } from "./TourPopover";

/**
 * Small bordered chip that shows a UI icon inline in running text. `weight`
 * matches an icon the app draws in another weight (the bold send arrow).
 */
export function InlineIcon({
  icon: IconComponent,
  weight,
}: {
  icon: Icon;
  weight?: IconWeight;
}) {
  return (
    <Box
      as="span"
      display="inline-flex"
      alignItems="center"
      justifyContent="center"
      verticalAlign="-3px"
      w="20px"
      h="20px"
      mx="1px"
      borderWidth="1px"
      borderColor="border"
      rounded="sm"
      bg="bg"
      fontSize="13px"
    >
      <IconComponent weight={weight} />
    </Box>
  );
}

/** A prompt shown as the user would type it. */
export function Example({ children }: { children: ReactNode }) {
  return (
    <Box
      bg="#F4F5F6"
      borderWidth="1px"
      borderColor="#E0E2E5"
      rounded="md"
      px="3"
      py="2"
      my="2"
      fontSize="sm"
    >
      {children}
    </Box>
  );
}

/** Secondary advice under the main copy. */
export function Tip({ children }: { children: ReactNode }) {
  return (
    <Box
      mt="2"
      pl="2"
      borderLeftWidth="2px"
      borderColor="#C3D16F"
      fontSize="xs"
      color="fg.muted"
    >
      {children}
    </Box>
  );
}

const INGREDIENTS = [
  {
    icon: <MapPinIcon />,
    title: "An area",
    text: "A country, region, park or your own area",
  },
  {
    icon: <StackSimpleIcon />,
    title: "A dataset",
    text: "Tree cover loss, land cover, alerts and more",
  },
  {
    icon: <CalendarBlankIcon />,
    title: "A time range",
    text: "“Since 2015”, “last year”, “2020 to 2024”",
  },
];

/** The three things a good question contains. */
export function Ingredients() {
  return (
    <Grid templateColumns="repeat(3, 1fr)" gap="2" my="3">
      {INGREDIENTS.map((i) => (
        <Box
          key={i.title}
          borderWidth="1px"
          borderColor="border"
          rounded="md"
          p="2.5"
        >
          <Flex align="center" gap="1.5" color="primary.solid" mb="0.5">
            {i.icon}
            <Text fontWeight="semibold" fontSize="sm" color="fg">
              {i.title}
            </Text>
          </Flex>
          <Text fontSize="xs" color="fg.muted">
            {i.text}
          </Text>
        </Box>
      ))}
    </Grid>
  );
}

/** Two-up summary cards for the closing step. */
export function SummaryPair({
  items,
}: {
  items: readonly { title: ReactNode; text: ReactNode }[];
}) {
  return (
    <Grid templateColumns="1fr 1fr" gap="2" my="3">
      {items.map((item, idx) => (
        <Box
          key={idx}
          borderWidth="1px"
          borderColor="border"
          rounded="md"
          px="2.5"
          py="2"
          fontSize="xs"
        >
          <Text fontWeight="semibold" fontSize="sm" mb="0.5">
            {item.title}
          </Text>
          {item.text}
        </Box>
      ))}
    </Grid>
  );
}

/** The status of a step that needs a prompt when none are left. */
export const BLOCKED_NOTE_SKIPPABLE = `No daily prompts left. Click ${SKIP_STEP_LABEL}.`;
export const BLOCKED_NOTE_TOMORROW =
  "No daily prompts left. You can do this task tomorrow.";

/** Said where a step asks for a question and the user has no prompts left. */
export const NO_PROMPTS_TODAY =
  "You have used all your daily prompts. You get new prompts tomorrow.";

/**
 * What sending a question costs: one of the user's daily prompts. Null when
 * the allowance is effectively unlimited (internal accounts), as the header
 * meter treats it. `whenNoneLeft` is the copy for a user with none left today.
 *
 * It names no allowance: the auth store holds a default until /api/auth/me
 * answers, and has no sign of when the real one is in.
 */
export function dailyPromptsNote(
  total: number,
  exhausted: boolean,
  whenNoneLeft: string
): string | null {
  if (!hasLimitedQuota(total)) return null;
  if (exhausted) return whenNoneLeft;
  return "Sending this question uses 1 of your daily prompts.";
}

/** `dailyPromptsNote` as a tip, live from the server's last count. */
export function DailyPromptsNote({ whenNoneLeft }: { whenNoneLeft: string }) {
  const { totalPrompts, promptsExhausted } = usePromptQuota();
  const note = dailyPromptsNote(totalPrompts, promptsExhausted, whenNoneLeft);
  return note ? <Tip>{note}</Tip> : null;
}
