"use client";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import { Box, Portal } from "@chakra-ui/react";

import { clampToViewport } from "@/src/shared/lib/tooltip-placement";

interface FloatingTooltipProps {
  /** The element the chart fills; `point` is measured from its top-left corner. */
  anchorRef: RefObject<HTMLElement | null>;
  /** Top-left of the panel in chart pixels — recharts' `coordinate`, or a spot the chart pins. */
  point: { x: number; y: number };
  children: ReactNode;
}

/**
 * Frame for a recharts tooltip that must not be clipped by the chart's
 * ancestors. Recharts positions its tooltip inside `.recharts-wrapper`, so any
 * ancestor with `overflow: hidden` — or a scroll container, like the insight
 * card in `InsightWorkspace` — cuts it off at its edge, and the only fix is to
 * leave that DOM subtree. The panel therefore renders through a `Portal` as a
 * fixed-position box at Chakra's `tooltip` layer (above `modal`, so it also
 * clears the fullscreen dialog), placed by turning the chart-relative `point`
 * into viewport coordinates and clamping it on screen. It is re-placed on
 * scroll and resize so it tracks the chart while shown. Use it as the root of
 * a `Tooltip`'s `content`.
 */
export function FloatingTooltip({
  anchorRef,
  point: { x, y },
  children,
}: FloatingTooltipProps) {
  const ref = useRef<HTMLDivElement>(null);

  const place = useCallback(() => {
    const el = ref.current;
    const anchor = anchorRef.current;
    if (!el || !anchor) return;
    const rect = anchor.getBoundingClientRect();
    const { left, top } = clampToViewport(
      {
        left: rect.left + x,
        top: rect.top + y,
        width: el.offsetWidth,
        height: el.offsetHeight,
      },
      { width: window.innerWidth, height: window.innerHeight }
    );
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  }, [anchorRef, x, y]);

  useLayoutEffect(place, [place]);

  useEffect(() => {
    // Capture phase: the scroll happens inside a nested container (the insight
    // card), and scroll events don't bubble to `window`.
    window.addEventListener("scroll", place, { capture: true, passive: true });
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, { capture: true });
      window.removeEventListener("resize", place);
    };
  }, [place]);

  return (
    <Portal>
      <Box ref={ref} position="fixed" zIndex="tooltip" pointerEvents="none">
        {children}
      </Box>
    </Portal>
  );
}
