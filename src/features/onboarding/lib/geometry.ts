import type { Rect, Side, Size } from "../model/tour";

/** Grow a rect by `pad` on every side. */
export function padRect(rect: Rect, pad: number): Rect {
  return {
    x: rect.x - pad,
    y: rect.y - pad,
    width: rect.width + pad * 2,
    height: rect.height + pad * 2,
  };
}

/** Clip a rect to the viewport; returns null when nothing is left on screen. */
export function clipToViewport(rect: Rect, viewport: Size): Rect | null {
  const x0 = Math.max(0, rect.x);
  const y0 = Math.max(0, rect.y);
  const x1 = Math.min(viewport.width, rect.x + rect.width);
  const y1 = Math.min(viewport.height, rect.y + rect.height);
  if (x1 <= x0 || y1 <= y0) return null;
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}

/** Bounding rect of two screen points (e.g. projected map corners). */
export function rectFromPoints(
  a: { x: number; y: number },
  b: { x: number; y: number }
): Rect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, width: Math.abs(a.x - b.x), height: Math.abs(a.y - b.y) };
}

/**
 * `clip-path` for the veil: the whole viewport minus a rectangular hole,
 * using the even-odd rule. Always the same ten points (outer frame, then the
 * hole), so the browser can animate one hole smoothly into the next. One
 * clipped element can't gap or overlap the way separate panes do. With no
 * hole, the hole collapses to a point at the centre (the veil covers all).
 */
export function veilClipPath(hole: Rect | null, viewport: Size): string {
  const { width: W, height: H } = viewport;
  const {
    x,
    y,
    width: w,
    height: h,
  } = hole ?? {
    x: W / 2,
    y: H / 2,
    width: 0,
    height: 0,
  };
  const pt = (px: number, py: number) =>
    `${Math.round(px)}px ${Math.round(py)}px`;
  return `polygon(evenodd, ${[
    pt(0, 0),
    pt(W, 0),
    pt(W, H),
    pt(0, H),
    pt(0, 0),
    pt(x, y),
    pt(x, y + h),
    pt(x + w, y + h),
    pt(x + w, y),
    pt(x, y),
  ].join(", ")})`;
}

export interface PopoverPlacement {
  readonly x: number;
  readonly y: number;
  /** null when the popover is centred (no target, or nothing fits). */
  readonly side: Side | null;
  /** Arrow offset along the popover edge that faces the target, px. */
  readonly arrowOffset: number;
}

const SIDE_ORDER: readonly Side[] = ["right", "bottom", "left", "top"];

/**
 * Place a popover of `size` next to `target`, trying `preferred` first and
 * then the other sides; centres it when there's no target or no side fits.
 * The result is clamped inside the viewport with `margin`.
 */
export function placePopover(
  target: Rect | null,
  size: Size,
  viewport: Size,
  preferred?: Side,
  gap = 14,
  margin = 12
): PopoverPlacement {
  const centred: PopoverPlacement = {
    x: Math.max(margin, (viewport.width - size.width) / 2),
    y: Math.max(margin, (viewport.height - size.height) / 2),
    side: null,
    arrowOffset: 0,
  };
  if (!target) return centred;

  const candidates: Record<Side, { x: number; y: number }> = {
    right: {
      x: target.x + target.width + gap,
      y: target.y + target.height / 2 - size.height / 2,
    },
    left: {
      x: target.x - gap - size.width,
      y: target.y + target.height / 2 - size.height / 2,
    },
    bottom: {
      x: target.x + target.width / 2 - size.width / 2,
      y: target.y + target.height + gap,
    },
    top: {
      x: target.x + target.width / 2 - size.width / 2,
      y: target.y - gap - size.height,
    },
  };

  const fits = (side: Side): boolean => {
    const { x, y } = candidates[side];
    return side === "left" || side === "right"
      ? x >= margin && x + size.width <= viewport.width - margin
      : y >= margin && y + size.height <= viewport.height - margin;
  };

  const order = preferred
    ? [preferred, ...SIDE_ORDER.filter((s) => s !== preferred)]
    : SIDE_ORDER;
  const side = order.find(fits);
  if (!side) return centred;

  const clamp = (v: number, lo: number, hi: number) =>
    Math.max(lo, Math.min(hi, v));
  const x = clamp(
    candidates[side].x,
    margin,
    viewport.width - size.width - margin
  );
  const y = clamp(
    candidates[side].y,
    margin,
    viewport.height - size.height - margin
  );
  const arrowMin = 16;
  const arrowOffset =
    side === "left" || side === "right"
      ? clamp(
          target.y + target.height / 2 - y,
          arrowMin,
          size.height - arrowMin
        )
      : clamp(target.x + target.width / 2 - x, arrowMin, size.width - arrowMin);

  return { x, y, side, arrowOffset };
}

/** Shallow equality for rects, so render loops can skip no-op updates. */
export function sameRect(a: Rect | null, b: Rect | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    Math.round(a.x) === Math.round(b.x) &&
    Math.round(a.y) === Math.round(b.y) &&
    Math.round(a.width) === Math.round(b.width) &&
    Math.round(a.height) === Math.round(b.height)
  );
}
