"use client";

import { Box, Button, CloseButton, Flex, Text } from "@chakra-ui/react";
import { useEffect, useState, type ReactNode, type Ref } from "react";

import type { PopoverPlacement } from "../lib/geometry";

export const POPOVER_WIDTH_PX = 360;
export const POPOVER_WIDE_WIDTH_PX = 480;

/** Footer buttons the copy names: the default move on, and the skip. */
export const NEXT_LABEL = "Next";
export const SKIP_STEP_LABEL = "Skip step";

/**
 * Where the user is in the tour: done steps tinted, the current one a pill,
 * the rest grey. Gives a sense of how much is left at a glance. Every dot has
 * at least 3:1 contrast on the popover.
 */
function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <Flex align="center" gap="1" aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <Box
          key={i}
          h="6px"
          w={i === current ? "16px" : "6px"}
          rounded="full"
          bg={
            i === current
              ? "primary.solid"
              : i < current
                ? "primary.400"
                : "neutral.500"
          }
          transition="width 0.2s, background 0.2s"
        />
      ))}
    </Flex>
  );
}

const FADE = "opacity 0.2s ease, visibility 0.2s";
const GLIDE = "left 0.35s ease, top 0.35s ease";

/**
 * Follow a moving target smoothly, but only from the frame after the popover
 * appears: it fades in at its place instead of sliding there.
 */
function useGlideOnceVisible(visible: boolean): boolean {
  const [glide, setGlide] = useState(false);
  useEffect(() => {
    if (!visible) return;
    const frame = window.requestAnimationFrame(() => setGlide(true));
    return () => {
      window.cancelAnimationFrame(frame);
      setGlide(false);
    };
  }, [visible]);
  return glide && visible;
}

export interface TourPopoverProps {
  ref?: Ref<HTMLDivElement>;
  /**
   * Shown: the step's target is measured (see `popoverReady`) and so is the
   * popover. Hidden, it still lays out, so it can be measured.
   */
  visible: boolean;
  placement: PopoverPlacement;
  wide: boolean;
  eyebrow?: string;
  title: string;
  body: ReactNode;
  stepNumber: number;
  stepCount: number;
  /** Waiting before the step can move on (no Next button). */
  awaitingAction: boolean;
  /** The wait is on the user ("Your turn"), not on Horizon. */
  userTurn: boolean;
  hint?: string;
  ctaLabel: string;
  secondaryLabel?: string;
  showBack: boolean;
  showSkipStep: boolean;
  onNext: () => void;
  /** Skip step: move on without the action (the tour may do it instead). */
  onSkipStep: () => void;
  onBack: () => void;
  onSecondary?: () => void;
  onClose: () => void;
}

/** Arrow square pinned to the popover edge that faces the target. */
function Arrow({ placement }: { placement: PopoverPlacement }) {
  if (!placement.side) return null;
  const half = 7;
  const along = placement.arrowOffset - half;
  const pos =
    placement.side === "right"
      ? { left: `-${half}px`, top: `${along}px` }
      : placement.side === "left"
        ? { right: `-${half}px`, top: `${along}px` }
        : placement.side === "bottom"
          ? { top: `-${half}px`, left: `${along}px` }
          : { bottom: `-${half}px`, left: `${along}px` };
  return (
    <Box
      position="absolute"
      w="14px"
      h="14px"
      bg="bg"
      transform="rotate(45deg)"
      {...pos}
    />
  );
}

export function TourPopover(props: TourPopoverProps) {
  const {
    ref,
    visible,
    placement,
    wide,
    eyebrow,
    title,
    body,
    stepNumber,
    stepCount,
    awaitingAction,
    userTurn,
    hint,
    ctaLabel,
    secondaryLabel,
    showBack,
    showSkipStep,
    onNext,
    onSkipStep,
    onBack,
    onSecondary,
    onClose,
  } = props;
  const glide = useGlideOnceVisible(visible);

  return (
    <Box
      ref={ref}
      role="dialog"
      aria-modal="false"
      aria-labelledby="onboarding-step-title"
      position="fixed"
      left={`${placement.x}px`}
      top={`${placement.y}px`}
      w={`${wide ? POPOVER_WIDE_WIDTH_PX : POPOVER_WIDTH_PX}px`}
      maxW="calc(100vw - 24px)"
      // The footer stays on screen on short windows; the body scrolls.
      maxH="calc(100dvh - 24px)"
      display="flex"
      flexDirection="column"
      bg="bg"
      rounded="lg"
      boxShadow="lg"
      pointerEvents="auto"
      opacity={visible ? 1 : 0}
      visibility={visible ? "visible" : "hidden"}
      css={{
        transition: glide ? `${FADE}, ${GLIDE}` : FADE,
        "@media (prefers-reduced-motion: reduce)": { transition: "none" },
      }}
    >
      <Arrow placement={placement} />
      <Box position="relative" flexShrink={0} px="5" pt="4">
        <CloseButton
          size="xs"
          position="absolute"
          top="2"
          right="2"
          aria-label="Close tour"
          onClick={onClose}
        />
        {(eyebrow || userTurn) && (
          <Flex
            align="center"
            gap="2"
            mb="1"
            fontFamily="mono"
            fontSize="10px"
            letterSpacing="0.06em"
            textTransform="uppercase"
            color="primary.solid"
          >
            {userTurn && (
              <Box as="span" bg="lime.400" color="fg" rounded="xs" px="1.5">
                Your turn
              </Box>
            )}
            {eyebrow}
          </Flex>
        )}
        <Text
          id="onboarding-step-title"
          fontSize="md"
          fontWeight="semibold"
          lineHeight="1.3"
          mb="1.5"
          pr="6"
        >
          {title}
        </Text>
      </Box>
      <Box px="5" pb="3" minH={0} overflowY="auto">
        <Box
          fontSize="sm"
          lineHeight="1.55"
          css={{
            "& p": { marginBottom: "8px" },
            "& p:last-child": { marginBottom: 0 },
            "& ul": { paddingLeft: "18px", marginBottom: "8px" },
            "& ul li": { listStyle: "disc", margin: "2px 0" },
          }}
        >
          {body}
        </Box>
      </Box>
      <Flex align="center" gap="2" flexShrink={0} px="5" pb="4" pt="1">
        <Flex flex="1" direction="column" gap="1.5" minW={0}>
          {/* A one-step guide has no progress to show. */}
          {stepCount > 1 && (
            <Flex align="center" gap="2">
              <ProgressDots current={stepNumber - 1} total={stepCount} />
              <Text fontSize="xs" color="fg.muted" aria-hidden>
                {stepNumber} of {stepCount}
              </Text>
              <Text srOnly>
                Step {stepNumber} of {stepCount}
              </Text>
            </Flex>
          )}
          {awaitingAction && (
            <Flex align="center" gap="2" fontSize="xs" color="fg.muted">
              <Box
                w="8px"
                h="8px"
                rounded="full"
                bg="secondary.400"
                boxShadow="0 0 0 3px {colors.secondary.200}"
              />
              {hint ?? "Use the highlighted control"}
            </Flex>
          )}
        </Flex>
        {secondaryLabel && onSecondary && (
          <Button size="xs" variant="ghost" onClick={onSecondary}>
            {secondaryLabel}
          </Button>
        )}
        {showBack && (
          <Button size="xs" variant="outline" onClick={onBack}>
            Back
          </Button>
        )}
        {awaitingAction ? (
          showSkipStep && (
            <Button size="xs" variant="ghost" onClick={onSkipStep}>
              {SKIP_STEP_LABEL}
            </Button>
          )
        ) : (
          <Button size="xs" colorPalette="primary" onClick={onNext}>
            {ctaLabel}
          </Button>
        )}
      </Flex>
    </Box>
  );
}
