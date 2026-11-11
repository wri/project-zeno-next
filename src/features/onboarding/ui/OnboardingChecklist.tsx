"use client";

import { Box, Button, Flex, Popover, Portal, Text } from "@chakra-ui/react";
import { CheckCircleIcon, CheckIcon } from "@phosphor-icons/react";

import { useFeatureFlag } from "@/src/shared/lib/feature-flags";

import { checklistSummary, type ChecklistSummary } from "../lib/checklist-view";
import type { ChecklistItemId } from "../model/onboarding-progress";
import useOnboardingStore, {
  selectChecklistShown,
} from "../model/onboarding-store";
import { ONBOARDING_FEATURE_FLAG } from "../model/tour-entry";
import { CHECKLIST_NAME } from "./tour-entry";
import { CHECKLIST_ITEMS, createChecklistTour } from "./tours/checklist-tours";

/** SVG strokes can't take Chakra tokens, so read the theme's CSS variables. */
const RING_TRACK = "var(--chakra-colors-border-emphasized)";
const RING_FILL = "var(--chakra-colors-primary-solid)";
/** The panel's top band; the arrow to the button takes its colour. */
const BAND_BG = "primary.900";
const CHECKLIST_INTRO =
  "Click a task for a short guide. Then do the task yourself. Horizon ticks it when you have done it.";

/** Small progress ring for the header button. */
function ProgressRing({ ratio }: { ratio: number }) {
  const r = 8;
  const circumference = 2 * Math.PI * r;
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" aria-hidden>
      <circle
        cx="10"
        cy="10"
        r={r}
        fill="none"
        stroke={RING_TRACK}
        strokeWidth="3"
      />
      <circle
        cx="10"
        cy="10"
        r={r}
        fill="none"
        stroke={RING_FILL}
        strokeWidth="3"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - ratio)}
        transform="rotate(-90 10 10)"
      />
    </svg>
  );
}

/**
 * The "Get started" checklist shown after the first-run tour: tasks the
 * user does in the app. A header button (map page, desktop) opens it in a
 * panel. Each item runs a short guide to where the task starts; it is ticked
 * when the app shows the task was done (`useChecklistDetection`), or by the
 * user for a task the app can't see. Mount it in the header's `actions`.
 */
export function OnboardingChecklist() {
  const enabled = useFeatureFlag(ONBOARDING_FEATURE_FLAG);
  return enabled ? <Checklist /> : null;
}

function Checklist() {
  // Hidden while a tour runs, so the panel can't cover the tour's popover.
  const shown = useOnboardingStore(selectChecklistShown);
  const expanded = useOnboardingStore((s) => s.checklistExpanded);
  const done = useOnboardingStore((s) => s.progress.checklistDone);
  const openChecklist = useOnboardingStore((s) => s.openChecklist);
  const closeChecklist = useOnboardingStore((s) => s.closeChecklist);

  const summary = checklistSummary(CHECKLIST_ITEMS, done, CHECKLIST_NAME);

  // The popover stays mounted while its button is hidden: it moves focus
  // into the panel only when it sees the panel open, and the first-run
  // tour's last step opens it as the button appears. Not lazily mounted
  // either: it names the panel from a title it finds as it mounts.
  return (
    <Popover.Root
      open={shown && expanded}
      onOpenChange={(e) =>
        e.open ? openChecklist("header") : closeChecklist()
      }
      positioning={{ placement: "bottom-end" }}
    >
      <Popover.Trigger asChild>
        <Button
          display={shown ? undefined : "none"}
          size="xs"
          variant="outline"
          h="32px"
          ps="2"
          pe="2.5"
          gap="1.5"
          rounded="sm"
          borderColor="border.emphasized"
          bg="bg"
          color="primary.900"
          fontWeight="medium"
          _hover={{ bg: "bg.subtle" }}
          _expanded={{ bg: "primary.25", borderColor: "primary.200" }}
          aria-label={summary.buttonLabel}
        >
          {summary.allDone ? (
            <Box as="span" display="inline-flex" color="fg.success">
              <CheckCircleIcon size={16} weight="fill" />
            </Box>
          ) : (
            <ProgressRing ratio={summary.ratio} />
          )}
          {/* Between md and lg the header is tight: the ring and count only. */}
          <Box as="span" hideBelow="lg">
            {CHECKLIST_NAME}
          </Box>
          <Text as="span" fontFamily="mono" color="fg.muted">
            {summary.count}
          </Text>
        </Button>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content w="320px">
            <Popover.Arrow css={{ "--arrow-background": `colors.${BAND_BG}` }}>
              <Popover.ArrowTip borderColor={BAND_BG} />
            </Popover.Arrow>
            <ChecklistPanel summary={summary} done={done} />
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  );
}

function ChecklistPanel({
  summary,
  done,
}: {
  summary: ChecklistSummary;
  done: readonly ChecklistItemId[];
}) {
  const startTour = useOnboardingStore((s) => s.startTour);
  const dismiss = useOnboardingStore((s) => s.dismissChecklist);
  const ticked = new Set(done);

  return (
    <>
      <Box bg={BAND_BG} color="white" px="4" pt="3" pb="2.5" roundedTop="l3">
        <Popover.Title fontWeight="semibold" fontSize="sm">
          {CHECKLIST_NAME}
        </Popover.Title>
        <Popover.Description fontSize="xs" opacity={0.75}>
          {summary.status}
        </Popover.Description>
        <Text fontSize="xs" opacity={0.75}>
          {CHECKLIST_INTRO}
        </Text>
        <Box
          h="4px"
          bg="whiteAlpha.300"
          rounded="full"
          mt="2"
          overflow="hidden"
        >
          <Box
            h="100%"
            bg="lime.400"
            w={`${summary.ratio * 100}%`}
            transition="width 0.4s"
          />
        </Box>
      </Box>
      <Box as="ul" p="1.5" listStyleType="none">
        {CHECKLIST_ITEMS.map((item) => {
          const isDone = ticked.has(item.id);
          return (
            <li key={item.id}>
              <Button
                variant="ghost"
                w="full"
                justifyContent="flex-start"
                gap="2.5"
                px="2"
                h="auto"
                py="2"
                fontWeight="normal"
                fontSize="sm"
                // Starting the guide closes this panel (see `startTour`).
                onClick={() => startTour(createChecklistTour(item))}
              >
                <Flex
                  w="20px"
                  h="20px"
                  flexShrink={0}
                  rounded="full"
                  align="center"
                  justify="center"
                  borderWidth="1.5px"
                  borderColor={isDone ? "green.solid" : "border.emphasized"}
                  bg={isDone ? "green.solid" : "transparent"}
                  color="green.contrast"
                >
                  {isDone && <CheckIcon size={12} weight="bold" />}
                </Flex>
                <Text
                  flex="1"
                  textAlign="left"
                  whiteSpace="normal"
                  color={isDone ? "fg.muted" : "fg"}
                  textDecoration={isDone ? "line-through" : "none"}
                >
                  {item.label}
                </Text>
              </Button>
            </li>
          );
        })}
      </Box>
      <Flex
        borderTopWidth="1px"
        borderColor="border"
        px="4"
        py="2"
        justify="flex-end"
      >
        {/* Taking the tour again (menu, Take the tour) brings it back. */}
        <Button size="2xs" variant="plain" color="fg.link" onClick={dismiss}>
          Hide checklist
        </Button>
      </Flex>
    </>
  );
}
