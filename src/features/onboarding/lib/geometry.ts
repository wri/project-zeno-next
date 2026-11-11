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

/** The part two rects share; null when they do not meet. */
export function intersectRect(a: Rect, b: Rect): Rect | null {
  const x0 = Math.max(a.x, b.x);
  const y0 = Math.max(a.y, b.y);
  const x1 = Math.min(a.x + a.width, b.x + b.width);
  const y1 = Math.min(a.y + a.height, b.y + b.height);
  if (x1 <= x0 || y1 <= y0) return null;
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
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

/** Space between a popover and its target, px. */
const GAP = 14;
/** The least space between a popover and the viewport edge, px. */
const MARGIN = 12;

/**
 * Place a popover of `size` next to `target`, trying `preferred` first and
 * then the other sides; centres it when there's no target or no side fits.
 * The result is clamped inside the viewport with `MARGIN`. `pointAt`, a
 * control inside a large target: the popover still sits beside the whole
 * target, but lines up with that control and its arrow points at it.
 */
export function placePopover(
  target: Rect | null,
  size: Size,
  viewport: Size,
  preferred?: Side,
  pointAt?: Rect | null
): PopoverPlacement {
  const centred: PopoverPlacement = {
    x: Math.max(MARGIN, (viewport.width - size.width) / 2),
    y: Math.max(MARGIN, (viewport.height - size.height) / 2),
    side: null,
    arrowOffset: 0,
  };
  if (!target) return centred;

  // Beside the whole target; lined up with (and pointing at) `aim`.
  const aim = pointAt ?? target;
  const aimX = aim.x + aim.width / 2;
  const aimY = aim.y + aim.height / 2;
  const candidates: Record<Side, { x: number; y: number }> = {
    right: {
      x: target.x + target.width + GAP,
      y: aimY - size.height / 2,
    },
    left: {
      x: target.x - GAP - size.width,
      y: aimY - size.height / 2,
    },
    bottom: {
      x: aimX - size.width / 2,
      y: target.y + target.height + GAP,
    },
    top: {
      x: aimX - size.width / 2,
      y: target.y - GAP - size.height,
    },
  };

  const fits = (side: Side): boolean => {
    const { x, y } = candidates[side];
    return side === "left" || side === "right"
      ? x >= MARGIN && x + size.width <= viewport.width - MARGIN
      : y >= MARGIN && y + size.height <= viewport.height - MARGIN;
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
    MARGIN,
    viewport.width - size.width - MARGIN
  );
  const y = clamp(
    candidates[side].y,
    MARGIN,
    viewport.height - size.height - MARGIN
  );
  const arrowMin = 16;
  const arrowOffset =
    side === "left" || side === "right"
      ? clamp(aimY - y, arrowMin, size.height - arrowMin)
      : clamp(aimX - x, arrowMin, size.width - arrowMin);

  return { x, y, side, arrowOffset };
}

/** Whether `point` lies in `rect` (edges included); never in no rect. */
export function pointInRect(
  point: { readonly x: number; readonly y: number },
  rect: Rect | null
): boolean {
  return (
    !!rect &&
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

/** The area two rects share, px². */
const overlapArea = (a: Rect, b: Rect): number =>
  Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) *
  Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));

/**
 * Where a docked popover of `size` sits: the first corner of bottom-right,
 * bottom-left, top-right and top-left that keeps it off the cut-out, so the
 * target stays in view while the user works. When every corner meets the
 * cut-out, the one that covers least of it (a cut-out that meets the
 * bottom-left and top-right corners always meets the top-left one too, so
 * top-left is mostly this fallback). No arrow: it points at nothing.
 */
export function dockPlacement(
  hole: Rect | null,
  size: Size,
  viewport: Size
): PopoverPlacement {
  const left = MARGIN;
  const right = Math.max(MARGIN, viewport.width - size.width - MARGIN);
  const top = MARGIN;
  const bottom = Math.max(MARGIN, viewport.height - size.height - MARGIN);
  const corners = [
    { x: right, y: bottom },
    { x: left, y: bottom },
    { x: right, y: top },
    { x: left, y: top },
  ];
  const covered = (c: { x: number; y: number }) =>
    hole ? overlapArea({ ...c, ...size }, hole) : 0;
  // Strictly less: on a tie the earlier corner in the order wins.
  const { x, y } = corners.reduce((best, c) =>
    covered(c) < covered(best) ? c : best
  );
  return { x, y, side: null, arrowOffset: 0 };
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
