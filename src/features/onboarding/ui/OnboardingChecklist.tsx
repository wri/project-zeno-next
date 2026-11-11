"use client";

import { Box, Button, Flex, Text } from "@chakra-ui/react";
import { CaretDownIcon, CheckIcon } from "@phosphor-icons/react";

import { getMapControlsLeftPx } from "@/app/explorationLayout";
import useSidebarStore from "@/app/store/sidebarStore";
import { useFeatureFlag } from "@/src/shared/lib/feature-flags";

import useOnboardingStore from "../model/onboarding-store";
import { ONBOARDING_FEATURE_FLAG } from "./tour-entry";
import { CHECKLIST_ITEMS, createChecklistTour } from "./tours/checklist-tours";

const NAVY = "#131E47";
/** SVG strokes can't take Chakra tokens, so read the theme's CSS variable. */
const LIME_VAR = "var(--chakra-colors-lime-400)";
const SUCCESS = "#2F8F4E";
/** Above the map, below the catalog column (1095) so open panels cover it. */
const CHECKLIST_Z_INDEX = 1090;

/** Small progress ring for the collapsed pill. */
function ProgressRing({ ratio }: { ratio: number }) {
  const r = 8;
  const circumference = 2 * Math.PI * r;
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden>
      <circle
        cx="10"
        cy="10"
        r={r}
        fill="none"
        stroke="rgba(255,255,255,.25)"
        strokeWidth="3"
      />
      <circle
        cx="10"
        cy="10"
        r={r}
        fill="none"
        stroke={LIME_VAR}
        strokeWidth="3"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - ratio)}
        transform="rotate(-90 10 10)"
      />
    </svg>
  );
}

/**
 * "Get to know Horizon" checklist shown after the first-run tour. Each item
 * runs a short walkthrough; items the tour already covered start ticked.
 */
export function OnboardingChecklist() {
  const enabled = useFeatureFlag(ONBOARDING_FEATURE_FLAG);
  return enabled ? <Checklist /> : null;
}

function Checklist() {
  const hydrated = useOnboardingStore((s) => s.hydrated);
  const progress = useOnboardingStore((s) => s.progress);
  const expanded = useOnboardingStore((s) => s.checklistExpanded);
  const tourRunning = useOnboardingStore((s) => s.tour !== null);
  const setExpanded = useOnboardingStore((s) => s.setChecklistExpanded);
  const dismiss = useOnboardingStore((s) => s.dismissChecklist);
  const startTour = useOnboardingStore((s) => s.startTour);

  const isChatFullSize = useSidebarStore((s) => s.isChatFullSize);
  const columnOpen = useSidebarStore(
    (s) => s.dataCatalogOpen || s.areasPanelOpen || s.insightsPanelOpen
  );

  if (
    !hydrated ||
    tourRunning ||
    progress.tourOutcome === null ||
    progress.checklistDismissed
  )
    return null;

  const done = new Set(progress.checklistDone);
  const doneCount = CHECKLIST_ITEMS.filter((i) => done.has(i.id)).length;
  const total = CHECKLIST_ITEMS.length;
  const ratio = doneCount / total;
  const left = getMapControlsLeftPx(isChatFullSize, columnOpen);

  if (!expanded) {
    return (
      <Button
        position="absolute"
        left={`${left}px`}
        bottom="4"
        zIndex={CHECKLIST_Z_INDEX}
        bg={NAVY}
        color="white"
        rounded="full"
        size="sm"
        gap="2"
        boxShadow="0 4px 16px rgba(0,0,0,0.2)"
        _hover={{ bg: NAVY, opacity: 0.92 }}
        onClick={() => setExpanded(true)}
      >
        <ProgressRing ratio={ratio} />
        Get started · {doneCount}/{total}
      </Button>
    );
  }

  return (
    <Box
      position="absolute"
      left={`${left}px`}
      bottom="4"
      zIndex={CHECKLIST_Z_INDEX}
      w="300px"
      bg="bg"
      rounded="lg"
      overflow="hidden"
      boxShadow="0 6px 24px rgba(0,0,0,0.18)"
      role="region"
      aria-label="Get to know Horizon"
    >
      <Box bg={NAVY} color="white" px="4" pt="3" pb="2.5">
        <Flex justify="space-between" align="center">
          <Text fontWeight="semibold" fontSize="sm">
            Get to know Horizon
          </Text>
          <Button
            size="2xs"
            variant="ghost"
            color="white"
            _hover={{ bg: "whiteAlpha.200" }}
            aria-label="Minimise checklist"
            onClick={() => setExpanded(false)}
          >
            <CaretDownIcon />
          </Button>
        </Flex>
        <Text fontSize="xs" opacity={0.75}>
          {doneCount === total
            ? "All done. Nice work."
            : `${doneCount} of ${total} done`}
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
            w={`${ratio * 100}%`}
            transition="width 0.4s"
          />
        </Box>
      </Box>
      <Box as="ul" p="1.5" listStyleType="none">
        {CHECKLIST_ITEMS.map((item) => {
          const isDone = done.has(item.id);
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
                  borderColor={isDone ? SUCCESS : "border.emphasized"}
                  bg={isDone ? SUCCESS : "transparent"}
                  color="white"
                >
                  {isDone && <CheckIcon size={12} weight="bold" />}
                </Flex>
                <Text
                  flex="1"
                  textAlign="left"
                  color={isDone ? "fg.muted" : "fg"}
                  textDecoration={isDone ? "line-through" : "none"}
                >
                  {item.label}
                </Text>
                <Text fontFamily="mono" fontSize="11px" color="fg.muted">
                  {item.duration}
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
        <Button size="2xs" variant="plain" color="fg.link" onClick={dismiss}>
          Dismiss
        </Button>
      </Flex>
    </Box>
  );
}
