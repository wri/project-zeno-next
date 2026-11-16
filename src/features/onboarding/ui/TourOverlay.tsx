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
  dockPlacement,
  intersectRect,
  padRect,
  placePopover,
  pointInRect,
  veilClipPath,
  type PopoverPlacement,
} from "../lib/geometry";
import usePrefersReducedMotion from "@/app/hooks/usePrefersReducedMotion";

import useOnboardingStore from "../model/onboarding-store";
import {
  APP_WAIT_SKIP_AFTER_MS,
  MISSING_TARGET_GRACE_MS,
  SKIPPED_NOTICE_MS,
  advanceDelayMs,
  canSkipWhileWaiting,
  docksOnTargetClick,
  isTypingTarget,
  missingTargetExpired,
  stepKind,
  waitStartedAgain,
  waitTick,
} from "../model/step-policy";
import type { Rect, Size } from "../model/tour";
import { NEXT_LABEL, POPOVER_WIDTH_PX, TourPopover } from "./TourPopover";
import type { UiTour, UiTourStep } from "./types";
import { holdsKeyboard } from "../lib/keyboard-reach";
import { popoverReady, type TargetState } from "../lib/target-state";
import {
  NO_ANNOUNCEMENT,
  nextAnnouncement,
  type AnnouncementInput,
} from "../lib/tour-announcement";
import { useAppValue } from "./app-actions";
import { skippedNotice, stepStatus } from "./status-copy";
import { useKeyboardReach } from "./use-keyboard-reach";
import { useTargetRect } from "./use-target-rect";

/** Above the chat panel (1100) and Chakra overlays used inside the app. */
const OVERLAY_Z_INDEX = 2100;
const WAIT_POLL_MS = 250;
const DEFAULT_PADDING_PX = 6;
const NEVER = () => false;
const ALWAYS = () => true;

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
 * One dimmed layer with the spotlight cut out by `clip-path`, so the hole
 * moves as a single shape: no seams, gaps or doubled-up darkness. No blur:
 * what the copy names just outside the cut-out stays readable. Without the
 * blur the dimming alone sets the target apart, so it is darker than it was
 * with blur: white outside reads 4.1:1 against white inside, and body text
 * outside keeps 4.2:1 on its dimmed page. The cut-out lets presses through
 * to the target; the rest of the veil catches them (and nudges the popover)
 * until the step is docked.
 */
const VEIL_CSS = {
  position: "fixed" as const,
  inset: 0,
  background: "rgba(15, 20, 32, 0.55)",
  pointerEvents: "auto" as const,
  transition: `clip-path ${SPOTLIGHT_EASE}, opacity 0.2s`,
  animation: "onboardingVeilIn 0.25s ease-out",
  "@media (prefers-reduced-motion: reduce)": {
    transition: "none",
    animation: "none",
  },
};

const RING_SHADOW = "0 0 0 2px white, 0 0 0 5px rgba(227,243,127,0.9)";

/**
 * The inner ring sits inside the cut-out, on the app's own (mostly white)
 * surface, not on the veil: white and lime vanish there (lime is 1.2:1 on
 * white). A solid primary line instead (8.8:1 on white), which never fades;
 * only the halo around it pulses. A CSS variable, as the keyframes below are
 * plain CSS.
 */
const INNER = "var(--chakra-colors-primary-solid)";
const INNER_RING_SHADOW = `0 0 0 2px ${INNER}`;

/**
 * Plain CSS keyframes. Kept out of Chakra's `css` prop, which breaks when a
 * nested `@keyframes` block shares a property name with a top-level style.
 */
const KEYFRAMES = `
@keyframes onboardingVeilIn { from { opacity: 0 } to { opacity: 1 } }
@keyframes onboardingPulse {
  0% { box-shadow: ${RING_SHADOW} }
  100% { box-shadow: 0 0 0 2px white, 0 0 0 14px rgba(227,243,127,0) }
}
@keyframes onboardingInnerPulse {
  0% { box-shadow: ${INNER_RING_SHADOW}, 0 0 0 3px color-mix(in srgb, ${INNER} 45%, transparent) }
  100% { box-shadow: ${INNER_RING_SHADOW}, 0 0 0 11px color-mix(in srgb, ${INNER} 0%, transparent) }
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
/**
 * In the css prop, not inline: an inline `animation` would beat the
 * reduced-motion query above.
 */
const PULSE = "onboardingPulse 1.4s ease-out infinite";
const RING_PULSE_CSS = { ...RING_CSS, animation: PULSE };
/**
 * Around the whole target when the step points at a control inside it
 * (`focus`): a thin edge, so the inner ring is the one the eye goes to.
 */
const RING_THIN_CSS = {
  ...RING_CSS,
  boxShadow: "0 0 0 1px rgba(255,255,255,0.85)",
};
const INNER_RING_CSS = {
  ...RING_CSS,
  borderRadius: "6px",
  boxShadow: INNER_RING_SHADOW,
};
const INNER_RING_PULSE_CSS = {
  ...INNER_RING_CSS,
  animation: "onboardingInnerPulse 1.4s ease-out infinite",
};
const INNER_PADDING_PX = 4;

/** Placement size until the popover has measured itself (it is hidden). */
const UNMEASURED_POPOVER: Size = { width: POPOVER_WIDTH_PX, height: 0 };

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
  const target = useTargetRect(step.target, stepKey, {
    fallback: step.fallback,
  });
  // The control inside the target the copy names. Its target is scrolled
  // into view already.
  const focus = useTargetRect(step.focus, stepKey, { scroll: false });
  const popoverRef = useRef<HTMLDivElement>(null);
  const [userTurn, setUserTurn] = useState(false);
  const reduceMotion = usePrefersReducedMotion();
  // One live region for the whole tour: a region that mounts with its text
  // is often not read, and each step's popover mounts fresh.
  const [announcement, setAnnouncement] = useState(NO_ANNOUNCEMENT);
  const announce = useCallback(
    (input: AnnouncementInput) =>
      setAnnouncement((prev) => nextAnnouncement(prev, input)),
    []
  );
  // The step the user moved aside to work in its target. Any move to another
  // step (or Back) opens it in the full view again.
  const docked = useOnboardingStore((s) => s.docked);

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
  // The inner ring, kept inside the cut-out (a control scrolled out of its
  // panel's view must not be ringed over the rest of the page).
  const inner =
    hole && target.found && focus.found && focus.rect
      ? intersectRect(padRect(focus.rect, INNER_PADDING_PX), hole)
      : null;
  // Only for "Your turn", and only on this step's own target: not on the
  // previous one, during the hold. On the inner ring when there is one.
  const pulse = target.found && userTurn && !docked && !reduceMotion;
  const outerCss = inner ? RING_THIN_CSS : pulse ? RING_PULSE_CSS : RING_CSS;

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
        style={{
          clipPath: veilClipPath(hole, viewport),
          // Docked: gone, and the whole app takes clicks again.
          opacity: docked ? 0 : 1,
          pointerEvents: docked ? "none" : undefined,
        }}
        onClick={shakePopover}
        aria-hidden
      />
      <Box
        css={outerCss}
        style={{ ...rectStyle(ringRect), opacity: hole && !docked ? 1 : 0 }}
        aria-hidden
      />
      <Box
        css={pulse && inner ? INNER_RING_PULSE_CSS : INNER_RING_CSS}
        // With nothing to ring it sits on the outer ring, so it shrinks in.
        style={{
          ...rectStyle(inner ?? ringRect),
          opacity: inner && !docked ? 1 : 0,
        }}
        aria-hidden
      />
      <Box role="status" aria-live="polite" srOnly>
        {announcement.text}
      </Box>
      <StepView
        key={stepKey}
        stepKey={stepKey}
        step={step}
        stepIndex={stepIndex}
        stepCount={tour.steps.length}
        target={target}
        hole={hole}
        pointAt={inner}
        viewport={viewport}
        popoverRef={popoverRef}
        onTurnChange={setUserTurn}
        onAnnounce={announce}
      />
    </Box>
  );
}

function StepView({
  stepKey,
  step,
  stepIndex,
  stepCount,
  target,
  hole,
  pointAt,
  viewport,
  popoverRef,
  onTurnChange,
  onAnnounce,
}: {
  stepKey: string;
  step: UiTourStep;
  stepIndex: number;
  stepCount: number;
  target: TargetState;
  hole: Rect | null;
  /** The ringed control inside the target (`focus`), if found. */
  pointAt: Rect | null;
  viewport: Size;
  popoverRef: RefObject<HTMLDivElement | null>;
  /** The status is "Your turn" (the ring pulses). */
  onTurnChange: (userTurn: boolean) => void;
  onAnnounce: (input: AnnouncementInput) => void;
}) {
  const { found, onFallback, missingSince } = target;
  // Moved aside to a corner while the user works in the target.
  const docked = useOnboardingStore((s) => s.docked);
  const onDock = useOnboardingStore((s) => s.setDocked);
  // Whether the action was already done when the step opened (e.g. the user
  // came Back to it): then show Next instead of waiting. The store has already
  // run the step's `onEnter`, so this sees the prepared state.
  const [doneAtEntry] = useState(() => step.waitFor?.() ?? true);
  // Steps with `autoAdvance: false` unlock Next instead of moving on.
  const [unlocked, setUnlocked] = useState(false);
  // The action is done and the step moves on after `advanceDelayMs`.
  const [advancing, setAdvancing] = useState(false);
  // Null until the popover has measured itself; it stays hidden until then.
  const [popoverSize, setPopoverSize] = useState<Size | null>(null);
  // A docked step was seen and stays in its corner, even if the user's click
  // took its target away.
  const visible =
    popoverSize !== null &&
    (docked ||
      popoverReady(target, {
        hasTarget: !!step.target,
        optional: !!step.optional,
      }));

  const advance = useOnboardingStore((s) => s.advance);
  const skipStepFrom = useOnboardingStore((s) => s.skipStep);
  const back = useOnboardingStore((s) => s.back);
  const endTour = useOnboardingStore((s) => s.endTour);
  const canGoBack = useOnboardingStore((s) => s.history.length > 0);
  const isLast = stepIndex === stepCount - 1;
  // Each move names the step it was made from, so a late timer or a second
  // click can't move the tour on twice.
  const next = useCallback(
    () => advance(false, stepIndex),
    [advance, stepIndex]
  );
  /** Move on without the user having seen this step (Back skips it). */
  const passOver = useCallback(
    () => advance(true, stepIndex),
    [advance, stepIndex]
  );
  /** The user's Skip step: the step's `onSkip` does it for them. */
  const skipStep = useCallback(
    () => skipStepFrom(stepIndex),
    [skipStepFrom, stepIndex]
  );
  const close = useCallback(() => endTour(false), [endTour]);

  // Action steps: poll the app until the user has done the thing.
  const awaitingAction = !!step.waitFor && !doneAtEntry && !unlocked;
  useEffect(() => {
    if (doneAtEntry || !step.waitFor) return;
    let advanceTimer: number | undefined;
    const poll = window.setInterval(() => {
      const tick = waitTick(step);
      if (tick === "wait") return;
      window.clearInterval(poll);
      if (tick === "skip") passOver();
      else if (tick === "advance") {
        setAdvancing(true);
        advanceTimer = window.setTimeout(next, advanceDelayMs(step));
      } else setUnlocked(true);
    }, WAIT_POLL_MS);
    return () => {
      window.clearInterval(poll);
      window.clearTimeout(advanceTimer);
    };
  }, [doneAtEntry, step, next, passOver]);

  // A wait on the app (not on the user) offers Skip step after a while, so a
  // slow or stuck answer never holds the user in the tour.
  const waitingOnApp = awaitingAction && stepKind(step) !== "action";
  const [waitedLong, setWaitedLong] = useState(false);
  useEffect(() => {
    if (!waitingOnApp) return;
    const timer = window.setTimeout(
      () => setWaitedLong(true),
      APP_WAIT_SKIP_AFTER_MS
    );
    return () => window.clearTimeout(timer);
  }, [waitingOnApp]);

  // The status bar. Failed, asked and blocked read app stores, and are kept
  // live after the wait's poll has stopped (e.g. once the answer is in).
  const failed = useAppValue(step.failedIf ?? NEVER);
  const asked = useAppValue(step.askedIf ?? NEVER);
  const blocked = useAppValue(step.blockedIf ?? NEVER);
  // With the chat usable, the user can ask again on a step whose answer is
  // in (e.g. answer a question asked back): its status waits again, without
  // the slow-wait words (Next is there already, not Skip step).
  const waitDoneNow = useAppValue(
    step.waitsOnApp && step.waitFor ? step.waitFor : ALWAYS
  );
  const again = waitStartedAgain(step, {
    waitOver: doneAtEntry || unlocked,
    waitDoneNow,
  });
  const status = stepStatus(step, {
    awaitingAction: awaitingAction || again,
    waitedLong: waitedLong && !again,
    completing:
      !again && !!step.waitFor && (doneAtEntry || unlocked || advancing),
    failed,
    asked,
    blocked,
  });
  const userTurn = status?.tone === "turn";
  useEffect(() => onTurnChange(userTurn), [userTurn, onTurnChange]);

  // After steps the tour passed over by itself, say so, for a few seconds
  // from when the popover shows.
  const notice = skippedNotice(useOnboardingStore((s) => s.passedOver));
  const [noticeOver, setNoticeOver] = useState(false);
  useEffect(() => {
    if (!visible || !notice) return;
    const timer = window.setTimeout(
      () => setNoticeOver(true),
      SKIPPED_NOTICE_MS
    );
    return () => window.clearTimeout(timer);
  }, [visible, notice]);

  // Focus moves to the popover as the step opens (once it shows), never on
  // a status change, so a keyboard or screen reader user lands on the step.
  const focused = useRef(false);
  useEffect(() => {
    if (!visible || focused.current) return;
    focused.current = true;
    popoverRef.current?.focus({ preventScroll: true });
  }, [visible, popoverRef]);

  // The live region: the step as it opens, then each change of status.
  const statusText = status?.text ?? null;
  useEffect(() => {
    if (!visible) return;
    onAnnounce({
      stepKey,
      stepNumber: stepIndex + 1,
      stepCount,
      title: step.title,
      status: statusText,
      notice,
    });
  }, [
    visible,
    onAnnounce,
    stepKey,
    stepIndex,
    stepCount,
    step.title,
    statusText,
    notice,
  ]);

  // Optional steps whose target never shows up (e.g. a card the agent didn't
  // emit) are passed over rather than pointing at nothing. Not once docked:
  // the user saw the step, and their own click may have moved the target.
  useEffect(() => {
    if (
      docked ||
      !step.optional ||
      !step.target ||
      found ||
      missingSince === null
    )
      return;
    const check = () => {
      if (step.skipIf?.()) return passOver();
      if (
        missingTargetExpired({
          now: Date.now(),
          missingSince,
          graceMs: MISSING_TARGET_GRACE_MS,
        })
      )
        passOver();
    };
    check();
    const poll = window.setInterval(check, WAIT_POLL_MS);
    return () => window.clearInterval(poll);
  }, [docked, step, found, missingSince, passOver]);

  // The first press inside the cut-out moves the step aside (docks it), so
  // the user can work in the target with the map clear. Capture phase: it
  // docks before the press changes the screen, and the press still reaches
  // the app. Only on this step's own target, once its popover shows.
  const canDock =
    visible && found && !docked && docksOnTargetClick(step, awaitingAction);
  useEffect(() => {
    if (!canDock || !hole) return;
    const onPointerDown = (e: PointerEvent) => {
      if (popoverRef.current?.contains(e.target as Node | null)) return;
      if (pointInRect({ x: e.clientX, y: e.clientY }, hole)) onDock(true);
    };
    window.addEventListener("pointerdown", onPointerDown, true);
    return () => window.removeEventListener("pointerdown", onPointerDown, true);
  }, [canDock, hole, popoverRef, onDock]);
  const showGuide = useCallback(() => {
    onDock(false);
    popoverRef.current?.focus({ preventScroll: true });
  }, [onDock, popoverRef]);

  // What the veil does for the pointer, for the keyboard: Tab reaches only
  // the lit target and the popover (and layers they open), until docked.
  const lit = !found ? undefined : onFallback ? step.fallback : step.target;
  useKeyboardReach({
    active: holdsKeyboard({ docked }),
    litTarget: lit?.id ?? null,
    popoverRef,
  });

  // Keyboard: Escape closes; arrows page through passive steps, once the
  // step's popover shows (no paging past a step the user has not seen).
  // Not while docked or typing: the keys belong to the app then.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (awaitingAction || !visible || docked) return;
      if (isTypingTarget(e.target instanceof HTMLElement ? e.target : null))
        return;
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft" && canGoBack && !step.noBack) back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    awaitingAction,
    visible,
    docked,
    close,
    next,
    back,
    canGoBack,
    step.noBack,
  ]);

  // Track the popover's size (it changes with each step's copy) for placement.
  useEffect(() => {
    const el = popoverRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      const { offsetWidth: width, offsetHeight: height } = el;
      setPopoverSize((prev) =>
        prev?.width === width && prev.height === height
          ? prev
          : { width, height }
      );
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [popoverRef]);

  const size = popoverSize ?? UNMEASURED_POPOVER;
  const placement: PopoverPlacement = docked
    ? dockPlacement(hole, size, viewport)
    : placePopover(hole, size, viewport, step.placement, pointAt);

  return (
    <TourPopover
      ref={popoverRef}
      visible={visible}
      placement={placement}
      wide={!step.target}
      docked={docked}
      eyebrow={step.eyebrow}
      title={step.title}
      body={step.body}
      stepNumber={stepIndex + 1}
      stepCount={stepCount}
      awaitingAction={awaitingAction}
      status={status}
      notice={noticeOver ? null : notice}
      ctaLabel={step.ctaLabel ?? (isLast ? "Finish" : NEXT_LABEL)}
      secondaryLabel={step.secondary?.label}
      showBack={canGoBack && !step.noBack && !awaitingAction}
      // Not once the action is done and the step is moving on.
      showSkipStep={canSkipWhileWaiting(step, waitedLong) && !advancing}
      onNext={next}
      onSkipStep={skipStep}
      onBack={back}
      onSecondary={
        step.secondary ? () => step.secondary?.onClick(endTour) : undefined
      }
      onShowGuide={showGuide}
      onClose={close}
    />
  );
}
