"use client";

import { Box, Button, CloseButton, Flex, Text } from "@chakra-ui/react";
import type { ReactNode, Ref } from "react";

import type { PopoverPlacement } from "../lib/geometry";

export const POPOVER_WIDTH_PX = 360;
export const POPOVER_WIDE_WIDTH_PX = 480;

/**
 * Where the user is in the tour: done steps tinted, the current one a pill,
 * the rest grey. Gives a sense of how much is left at a glance.
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
          bg={i <= current ? "primary.solid" : "border"}
          opacity={i < current ? 0.45 : 1}
          transition="width 0.2s, background 0.2s"
        />
      ))}
    </Flex>
  );
}

export interface TourPopoverProps {
  ref?: Ref<HTMLDivElement>;
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
    onBack,
    onSecondary,
    onClose,
  } = props;

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
      bg="bg"
      rounded="lg"
      boxShadow="0 16px 48px rgba(0,0,0,0.28)"
      pointerEvents="auto"
      css={{
        transition: "left 0.35s ease, top 0.35s ease",
        "@media (prefers-reduced-motion: reduce)": { transition: "none" },
      }}
    >
      <Arrow placement={placement} />
      <Box position="relative" px="5" pt="4" pb="3">
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
      <Flex align="center" gap="2" px="5" pb="4" pt="1">
        <Flex flex="1" direction="column" gap="1.5" minW={0}>
          <ProgressDots current={stepNumber - 1} total={stepCount} />
          <Text srOnly>
            Step {stepNumber} of {stepCount}
          </Text>
          {awaitingAction && (
            <Flex align="center" gap="2" fontSize="xs" color="fg.muted">
              <Box
                w="8px"
                h="8px"
                rounded="full"
                bg="#C3D16F"
                boxShadow="0 0 0 3px rgba(195,209,111,0.3)"
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
            <Button size="xs" variant="ghost" onClick={onNext}>
              Skip step
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
