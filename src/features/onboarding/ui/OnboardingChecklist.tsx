"use client";

import {
  Box,
  Button,
  Flex,
  Popover,
  Portal,
  Text,
  useBreakpointValue,
} from "@chakra-ui/react";
import {
  ArrowsLeftRightIcon,
  BellIcon,
  CaretRightIcon,
  CheckCircleIcon,
  CheckIcon,
  FilePdfIcon,
  GlobeHemisphereWestIcon,
  SelectionPlusIcon,
  ShieldCheckIcon,
  type Icon,
} from "@phosphor-icons/react";
import { useEffect, useId, useRef, useState } from "react";

import { AI_ASSISTANT_LABEL } from "@/app/ChatPanelHeader";
import { Tooltip } from "@/app/components/ui/tooltip";
import { useFeatureFlag } from "@/src/shared/lib/feature-flags";

import {
  checklistRows,
  checklistSummary,
  tickAnnouncement,
  type ChecklistRow,
  type ChecklistSummary,
} from "../lib/checklist-view";
import type { ChecklistItemId } from "../model/onboarding-progress";
import useOnboardingStore, {
  selectChecklistShown,
} from "../model/onboarding-store";
import { ONBOARDING_FEATURE_FLAG } from "../model/tour-entry";
import { CHECKLIST_NAME, TAKE_THE_TOUR_LABEL } from "./tour-entry";
import {
  CHECKLIST_ITEMS,
  MANUAL_TICK_LABEL,
  createChecklistTour,
  type ChecklistItem,
} from "./tours/checklist-tours";

/** SVG strokes can't take Chakra tokens, so read the theme's CSS variables. */
const RING_TRACK = "var(--chakra-colors-border-emphasized)";
const RING_FILL = "var(--chakra-colors-primary-solid)";
/** The panel's top band; the arrow to the button takes its colour. */
const BAND_BG = "primary.900";

/** The button on an open task's row that starts its guide. */
const SHOW_ME_LABEL = "Show me";
const CHECKLIST_INTRO = `Do each task yourself. For a short guide, click ${SHOW_ME_LABEL}. Horizon ticks a task when you have done it.`;
const MANUAL_NOTE = "Horizon cannot see when you have done this task.";
const HIDE_LABEL = "Hide checklist";
const HIDDEN_HINT = `To show it again, open the menu and click ${TAKE_THE_TOUR_LABEL}.`;

/** Each task's icon on its row, until the task is done. */
const TASK_ICONS: Record<ChecklistItemId, Icon> = {
  alerts: BellIcon,
  "protected-area": ShieldCheckIcon,
  "own-area": SelectionPlusIcon,
  compare: ArrowsLeftRightIcon,
  "dashboard-pdf": FilePdfIcon,
  "satellite-imagery": GlobeHemisphereWestIcon,
};

const labelOf = (id: ChecklistItemId) =>
  CHECKLIST_ITEMS.find((item) => item.id === id)?.label ?? id;

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
 * panel. Each open task has a short guide (Show me); a task is ticked when
 * the app shows it was done (`useChecklistDetection`), or on its row by the
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
  const open = shown && expanded;
  const triggerId = useId();
  const contentRef = useRef<HTMLDivElement>(null);
  // Between md and lg the button shows only the ring and the count.
  const nameHidden =
    useBreakpointValue({ base: false, md: true, lg: false }, { ssr: false }) ??
    false;

  // One polite live region says what got ticked, panel open or not.
  const [announcement, setAnnouncement] = useState("");
  useEffect(
    () =>
      useOnboardingStore.subscribe((next, prev) => {
        const text = tickAnnouncement(
          prev,
          next,
          labelOf,
          CHECKLIST_ITEMS.length
        );
        if (text) setAnnouncement(text);
      }),
    []
  );

  const summary = checklistSummary(CHECKLIST_ITEMS, done, CHECKLIST_NAME);

  // The popover stays mounted while its button is hidden: it moves focus
  // into the panel only when it sees the panel open, and the first-run
  // tour's last step opens it as the button appears. Not lazily mounted
  // either: it names the panel from a title it finds as it mounts.
  return (
    <>
      <Popover.Root
        ids={{ trigger: triggerId }}
        open={open}
        onOpenChange={(e) =>
          e.open ? openChecklist("header") : closeChecklist()
        }
        positioning={{ placement: "bottom-end" }}
      >
        <Tooltip
          ids={{ trigger: triggerId }}
          content={CHECKLIST_NAME}
          disabled={!nameHidden}
          showArrow
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
              <Box as="span" hideBelow="lg">
                {CHECKLIST_NAME}
              </Box>
              <Text as="span" fontFamily="mono" color="fg.muted">
                {summary.count}
              </Text>
            </Button>
          </Popover.Trigger>
        </Tooltip>
        <Portal>
          <Popover.Positioner>
            <Popover.Content ref={contentRef} w="320px">
              <Popover.Arrow
                css={{ "--arrow-background": `colors.${BAND_BG}` }}
              >
                <Popover.ArrowTip borderColor={BAND_BG} />
              </Popover.Arrow>
              {/* Each opening starts afresh: the success card again once
                  every task is done. */}
              <ChecklistPanel
                key={String(open)}
                summary={summary}
                done={done}
                focusPanel={() => contentRef.current?.focus()}
              />
            </Popover.Content>
          </Popover.Positioner>
        </Portal>
      </Popover.Root>
      <Text srOnly aria-live="polite">
        {announcement}
      </Text>
    </>
  );
}

function ChecklistPanel({
  summary,
  done,
  focusPanel,
}: {
  summary: ChecklistSummary;
  done: readonly ChecklistItemId[];
  /** Keeps focus in the panel when the control that had it goes. */
  focusPanel: () => void;
}) {
  const startTour = useOnboardingStore((s) => s.startTour);
  const markDone = useOnboardingStore((s) => s.markChecklistDone);
  const dismiss = useOnboardingStore((s) => s.dismissChecklist);
  const [seeTasks, setSeeTasks] = useState(false);
  const hintId = useId();
  const showSuccess = summary.allDone && !seeTasks;

  return (
    <>
      <Box bg={BAND_BG} color="white" px="4" pt="3" pb="2.5" roundedTop="l3">
        <Popover.Title fontWeight="semibold" fontSize="sm">
          {CHECKLIST_NAME}
        </Popover.Title>
        <Popover.Description fontSize="xs" opacity={0.75}>
          {summary.status}
        </Popover.Description>
        {!showSuccess && (
          <Text fontSize="xs" opacity={0.75}>
            {CHECKLIST_INTRO}
          </Text>
        )}
        <Box
          role="progressbar"
          aria-label="Progress"
          aria-valuemin={0}
          aria-valuemax={summary.total}
          aria-valuenow={summary.doneCount}
          aria-valuetext={summary.status}
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
      {showSuccess ? (
        <SuccessCard
          total={summary.total}
          onClose={dismiss}
          onSeeTasks={() => {
            setSeeTasks(true);
            focusPanel();
          }}
        />
      ) : (
        <>
          <Box as="ul" m="0" p="1.5" listStyleType="none">
            {checklistRows(CHECKLIST_ITEMS, done).map((row) => (
              <TaskRow
                key={row.item.id}
                row={row}
                // Starting the guide closes this panel (see `startTour`).
                onShowMe={() => startTour(createChecklistTour(row.item))}
                onMarkDone={() => {
                  markDone([row.item.id], "manual");
                  focusPanel();
                }}
              />
            ))}
          </Box>
          <Box borderTopWidth="1px" borderColor="border" px="4" py="2">
            <Button
              size="2xs"
              variant="plain"
              color="fg.link"
              px="0"
              aria-describedby={hintId}
              onClick={dismiss}
            >
              {HIDE_LABEL}
            </Button>
            <Text id={hintId} fontSize="xs" color="fg.muted">
              {HIDDEN_HINT}
            </Text>
          </Box>
        </>
      )}
    </>
  );
}

function TaskRow({
  row,
  onShowMe,
  onMarkDone,
}: {
  row: ChecklistRow<ChecklistItem>;
  onShowMe: () => void;
  onMarkDone: () => void;
}) {
  const { item, done } = row;
  const TaskIcon = TASK_ICONS[item.id];
  return (
    <Flex as="li" align="flex-start" gap="2.5" px="2" py="2">
      <Flex
        w="20px"
        h="20px"
        flexShrink={0}
        align="center"
        justify="center"
        color={done ? "fg.success" : "fg.muted"}
      >
        {done ? (
          <CheckCircleIcon size={20} weight="fill" aria-hidden />
        ) : (
          <TaskIcon size={18} aria-hidden />
        )}
        <Text srOnly>{done ? "Done" : "Not done"}</Text>
      </Flex>
      <Box flex="1" minW={0}>
        <Text fontSize="sm">{item.label}</Text>
        {row.canMarkDone && (
          <>
            <Text fontSize="xs" color="fg.muted" mt="0.5">
              {MANUAL_NOTE}
            </Text>
            <Button
              size="2xs"
              variant="outline"
              mt="1.5"
              aria-label={`${MANUAL_TICK_LABEL}: ${item.label}`}
              onClick={onMarkDone}
            >
              <CheckIcon />
              {MANUAL_TICK_LABEL}
            </Button>
          </>
        )}
      </Box>
      {row.canShowMe && (
        <Button
          size="xs"
          variant="plain"
          color="fg.link"
          h="auto"
          px="0"
          gap="0.5"
          flexShrink={0}
          aria-label={`${SHOW_ME_LABEL}: ${item.label}`}
          onClick={onShowMe}
        >
          {SHOW_ME_LABEL}
          <CaretRightIcon />
        </Button>
      )}
    </Flex>
  );
}

/** Shown instead of the rows once every task is done. */
function SuccessCard({
  total,
  onClose,
  onSeeTasks,
}: {
  total: number;
  onClose: () => void;
  onSeeTasks: () => void;
}) {
  return (
    <Box px="4" py="4">
      <Box color="fg.success" mb="2">
        <CheckCircleIcon size={32} weight="fill" aria-hidden />
      </Box>
      <Text fontWeight="semibold" fontSize="md">
        You have done all {total} tasks.
      </Text>
      <Text fontSize="sm" mt="1">
        You are ready to use Horizon on your own. You can ask the{" "}
        {AI_ASSISTANT_LABEL} your own question now.
      </Text>
      <Flex gap="2" mt="3">
        {/* Dismisses the checklist for good, as Hide checklist does. */}
        <Button size="xs" colorPalette="primary" onClick={onClose}>
          Close
        </Button>
        <Button size="xs" variant="outline" onClick={onSeeTasks}>
          See the tasks again
        </Button>
      </Flex>
    </Box>
  );
}
