"use client";

import { Box, Portal } from "@chakra-ui/react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

import {
  padRect,
  placePopover,
  veilClipPath,
  type PopoverPlacement,
} from "../lib/geometry";
import usePrefersReducedMotion from "@/app/hooks/usePrefersReducedMotion";

import useOnboardingStore from "../model/onboarding-store";
import type { Rect, Size } from "../model/tour";
import { POPOVER_WIDTH_PX, TourPopover } from "./TourPopover";
import type { UiTour, UiTourStep } from "./types";
import { useTargetRect, type TargetState } from "./use-target-rect";

/** Above the chat panel (1100) and Chakra overlays used inside the app. */
const OVERLAY_Z_INDEX = 2100;
const WAIT_POLL_MS = 250;
/** Pause after an action completes so the user sees the result before moving on. */
const ADVANCE_DELAY_MS = 450;
/** Default wait before skipping an optional step whose target hasn't appeared. */
const OPTIONAL_TARGET_TIMEOUT_MS = 2000;
const DEFAULT_PADDING_PX = 6;

/** A gentle side-to-side shake: "the tour is still open, look here". */
const SHAKE_KEYFRAMES: Keyframe[] = [
  { transform: "translateX(0)" },
  { transform: "translateX(-6px)" },
  { transform: "translateX(6px)" },
  { transform: "translateX(-3px)" },
  { transform: "translateX(0)" },
];

const SPOTLIGHT_EASE = "0.4s cubic-bezier(.3,.7,.2,1)";

/**
 * One blurred, dimmed layer with the spotlight cut out by `clip-path`, so the
 * hole moves as a single shape: no seams, gaps or doubled-up darkness.
 */
const VEIL_CSS = {
  position: "fixed" as const,
  inset: 0,
  background: "rgba(15, 20, 32, 0.52)",
  backdropFilter: "blur(3px) saturate(0.75)",
  pointerEvents: "auto" as const,
  transition: `clip-path ${SPOTLIGHT_EASE}`,
  animation: "onboardingVeilIn 0.25s ease-out",
  "@media (prefers-reduced-motion: reduce)": {
    transition: "none",
    animation: "none",
  },
};

const RING_SHADOW = "0 0 0 2px white, 0 0 0 5px rgba(227,243,127,0.9)";

/**
 * Plain CSS keyframes. Kept out of Chakra's `css` prop, which breaks when a
 * nested `@keyframes` block shares a property name with a top-level style.
 */
const KEYFRAMES = `
@keyframes onboardingVeilIn { from { opacity: 0 } to { opacity: 1 } }
@keyframes onboardingPulse {
  0% { box-shadow: ${RING_SHADOW} }
  100% { box-shadow: 0 0 0 2px white, 0 0 0 14px rgba(227,243,127,0) }
}`;
const RING_CSS = {
  position: "fixed" as const,
  borderRadius: "8px",
  pointerEvents: "none" as const,
  boxShadow: RING_SHADOW,
  transition: `left ${SPOTLIGHT_EASE}, top ${SPOTLIGHT_EASE}, width ${SPOTLIGHT_EASE}, height ${SPOTLIGHT_EASE}, opacity 0.2s`,
  "@media (prefers-reduced-motion: reduce)": {
    transition: "none",
    animation: "none",
  },
};

const rectStyle = (r: Rect) => ({
  left: `${r.x}px`,
  top: `${r.y}px`,
  width: `${r.width}px`,
  height: `${r.height}px`,
});

function useViewport(): Size {
  const [size, setSize] = useState<Size>(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));
  useEffect(() => {
    const onResize = () =>
      setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return size;
}

/**
 * Renders the running tour: a blurred veil with a spotlight hole over the
 * step's target, a highlight ring, and the step popover. Mount once in the
 * desktop layout; renders nothing while no tour is running.
 */
export function TourOverlay() {
  const tour = useOnboardingStore((s) => s.tour) as UiTour | null;
  const stepIndex = useOnboardingStore((s) => s.stepIndex);
  if (!tour?.steps[stepIndex]) return null;
  return (
    <Portal>
      <ActiveTour key={tour.id} tour={tour} stepIndex={stepIndex} />
    </Portal>
  );
}

/**
 * Lives for the whole tour, so the veil and ring glide from one step's
 * target to the next. Each step's popover and logic mount fresh in StepView.
 */
function ActiveTour({ tour, stepIndex }: { tour: UiTour; stepIndex: number }) {
  const step = tour.steps[stepIndex];
  const stepKey = `${tour.id}:${step.id}`;
  const viewport = useViewport();
  const target = useTargetRect(step.target, stepKey);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [awaitingAction, setAwaitingAction] = useState(false);
  const reduceMotion = usePrefersReducedMotion();

  // Clicking the dimmed area nudges the popover instead of doing nothing.
  const shakePopover = useCallback(() => {
    if (!reduceMotion)
      popoverRef.current?.animate(SHAKE_KEYFRAMES, {
        duration: 350,
        easing: "ease-out",
      });
  }, [reduceMotion]);

  const hole = target.rect
    ? padRect(target.rect, step.padding ?? DEFAULT_PADDING_PX)
    : null;
  // With no hole the ring shrinks into the centre as it fades, like the veil.
  const ringRect = hole ?? {
    x: viewport.width / 2,
    y: viewport.height / 2,
    width: 0,
    height: 0,
  };

  return (
    <Box
      position="fixed"
      inset="0"
      zIndex={OVERLAY_Z_INDEX}
      pointerEvents="none"
    >
      <style>{KEYFRAMES}</style>
      <Box
        css={VEIL_CSS}
        style={{ clipPath: veilClipPath(hole, viewport) }}
        onClick={shakePopover}
        aria-hidden
      />
      <Box
        css={RING_CSS}
        style={{
          ...rectStyle(ringRect),
          opacity: hole ? 1 : 0,
          animation:
            hole && awaitingAction
              ? "onboardingPulse 1.4s ease-out infinite"
              : undefined,
        }}
        aria-hidden
      />
      <StepView
        key={stepKey}
        step={step}
        stepIndex={stepIndex}
        stepCount={tour.steps.length}
        target={target}
        hole={hole}
        viewport={viewport}
        popoverRef={popoverRef}
        onBlockedClick={shakePopover}
        onAwaitingChange={setAwaitingAction}
      />
    </Box>
  );
}

function StepView({
  step,
  stepIndex,
  stepCount,
  target,
  hole,
  viewport,
  popoverRef,
  onBlockedClick,
  onAwaitingChange,
}: {
  step: UiTourStep;
  stepIndex: number;
  stepCount: number;
  target: TargetState;
  hole: Rect | null;
  viewport: Size;
  popoverRef: RefObject<HTMLDivElement | null>;
  onBlockedClick: () => void;
  onAwaitingChange: (awaiting: boolean) => void;
}) {
  const { found, missingSince } = target;
  // Whether the action was already done when the step opened (e.g. the user
  // came Back to it): then show Next instead of waiting. The store has already
  // run the step's `onEnter`, so this sees the prepared state.
  const [doneAtEntry] = useState(() => step.waitFor?.() ?? true);
  // Steps with `autoAdvance: false` unlock Next instead of moving on.
  const [unlocked, setUnlocked] = useState(false);
  const [popoverSize, setPopoverSize] = useState<Size>({
    width: POPOVER_WIDTH_PX,
    height: 220,
  });

  const advance = useOnboardingStore((s) => s.advance);
  const back = useOnboardingStore((s) => s.back);
  const endTour = useOnboardingStore((s) => s.endTour);
  const canGoBack = useOnboardingStore((s) => s.history.length > 0);
  const isLast = stepIndex === stepCount - 1;
  const next = useCallback(() => advance(), [advance]);
  /** Move on without the user having seen this step (Back skips it). */
  const skip = useCallback(() => advance(true), [advance]);
  const close = useCallback(() => endTour(false), [endTour]);

  // A target that's still on its way (see `holdWhile`): wait, don't skip.
  const waitingForTarget = !!step.target && !found && !!step.holdWhile?.();
  // Action steps: poll the app until the user has done the thing.
  const awaitingAction =
    (!!step.waitFor && !doneAtEntry && !unlocked) || waitingForTarget;
  useEffect(
    () => onAwaitingChange(awaitingAction),
    [awaitingAction, onAwaitingChange]
  );
  useEffect(() => {
    if (doneAtEntry || !step.waitFor) return;
    const waitFor = step.waitFor;
    const autoAdvance = step.autoAdvance ?? true;
    let advanceTimer: number | undefined;
    const poll = window.setInterval(() => {
      if (!waitFor()) return;
      window.clearInterval(poll);
      if (autoAdvance) advanceTimer = window.setTimeout(next, ADVANCE_DELAY_MS);
      else setUnlocked(true);
    }, WAIT_POLL_MS);
    return () => {
      window.clearInterval(poll);
      window.clearTimeout(advanceTimer);
    };
  }, [doneAtEntry, step, next]);

  // A step waiting on the app, which is already done, has nothing to show.
  useEffect(() => {
    const autoAdvances = step.autoAdvance ?? true;
    if (step.waitsOnApp && autoAdvances && step.waitFor && doneAtEntry) skip();
  }, [step, doneAtEntry, skip]);

  // Optional steps whose target never shows up (e.g. a card the agent didn't
  // emit) are skipped rather than pointing at nothing; `holdWhile` defers it.
  useEffect(() => {
    if (!step.optional || !step.target || found || missingSince === null)
      return;
    const timeout = step.targetTimeoutMs ?? OPTIONAL_TARGET_TIMEOUT_MS;
    const skipUnlessHeld = () => {
      if (!step.holdWhile?.()) skip();
    };
    let poll: number | undefined;
    const timer = window.setTimeout(
      () => {
        skipUnlessHeld();
        poll = window.setInterval(skipUnlessHeld, WAIT_POLL_MS);
      },
      Math.max(0, missingSince + timeout - Date.now())
    );
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(poll);
    };
  }, [step, found, missingSince, skip]);

  // Keyboard: Escape closes; arrows page through passive steps.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (awaitingAction) return;
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft" && canGoBack && !step.noBack) back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [awaitingAction, close, next, back, canGoBack, step.noBack]);

  // Track the popover's size (it changes with each step's copy) for placement.
  useEffect(() => {
    const el = popoverRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      const { offsetWidth: width, offsetHeight: height } = el;
      setPopoverSize((prev) =>
        prev.width === width && prev.height === height
          ? prev
          : { width, height }
      );
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [popoverRef]);

  const placement: PopoverPlacement = placePopover(
    hole,
    popoverSize,
    viewport,
    step.placement
  );

  return (
    <>
      {/* Passive steps block clicks on the target; action steps let them through. */}
      {hole && !awaitingAction && (
        <Box
          position="fixed"
          pointerEvents="auto"
          style={rectStyle(hole)}
          onClick={onBlockedClick}
        />
      )}
      <TourPopover
        ref={popoverRef}
        placement={placement}
        wide={!step.target}
        eyebrow={step.eyebrow}
        title={step.title}
        body={step.body}
        stepNumber={stepIndex + 1}
        stepCount={stepCount}
        awaitingAction={awaitingAction}
        userTurn={awaitingAction && !waitingForTarget && !step.waitsOnApp}
        hint={waitingForTarget ? "Waiting for Horizon…" : step.hint}
        ctaLabel={step.ctaLabel ?? (isLast ? "Finish" : "Next")}
        secondaryLabel={step.secondary?.label}
        showBack={canGoBack && !step.noBack && !awaitingAction}
        showSkipStep={!!step.skippable}
        onNext={next}
        onBack={back}
        onSecondary={
          step.secondary ? () => step.secondary?.onClick(endTour) : undefined
        }
        onClose={close}
      />
    </>
  );
}
