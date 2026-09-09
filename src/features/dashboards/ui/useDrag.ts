"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Where a dragged item would land: a zone key and the item the slot sits in
 * front of there, or null for "after everything".
 */
export interface DropSlot {
  key: string;
  beforeId: string | null;
}

/** A lifted item's box, relative to the grid it is positioned in. */
export interface LiftedRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface DragState extends DropSlot {
  id: string;
  /**
   * Set once the item is dropped and its move is pending: the slot stays
   * where it is, and the item hidden, until the caller's data reflects the
   * move and it calls `finish()`. Ending the drag any earlier paints the old
   * order for a frame before the optimistic update lands.
   */
  dropped?: boolean;
  /** Where the item was lifted from; it stays this size while in flight. */
  rect: LiftedRect;
  /**
   * The pointer's offset inside the item at grab time. The lifted item
   * shrinks around this point, so it stays under the cursor.
   */
  grab: { x: number; y: number };
  /**
   * The pointer at drag start, in page coordinates. Every later position is
   * written straight to the lifted item's `transform` (see `liftedRef`) so a
   * page of maps and charts doesn't re-render on every pointer move.
   */
  origin: { x: number; y: number };
}

export interface DragStartArgs extends DropSlot {
  id: string;
  rect: LiftedRect;
  grab: { x: number; y: number };
}

/**
 * Dragging within this many pixels of the viewport's top or bottom scrolls
 * the page, faster the closer to the edge — so a drop target below the fold
 * can be reached without letting go.
 */
const SCROLL_EDGE = 80;
const SCROLL_MAX_STEP = 24;

/** The lifted item at half size with a slight tilt, per the design. */
function liftedTransform(dx: number, dy: number, tilt: number): string {
  return `translate3d(${dx}px, ${dy}px, 0) rotate(${tilt}deg) scale(0.5)`;
}

/**
 * Zones name themselves; items name what they carry. Widgets drop into the
 * section panels, sections into the column of panels — two independent
 * gestures over the same DOM, told apart by their attributes.
 */
export const DROP_ZONE_ATTR = "data-drop-zone";
export const DRAG_ITEM_ATTR = "data-drag-item";
export const SECTION_ZONE_ATTR = "data-section-zone";
export const SECTION_ITEM_ATTR = "data-section-item";

/** The drop zone under the cursor, or null between zones. */
function zoneAt(x: number, y: number, zoneAttr: string): HTMLElement | null {
  const zones = document.querySelectorAll<HTMLElement>(`[${zoneAttr}]`);
  for (const zone of zones) {
    const r = zone.getBoundingClientRect();
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return zone;
  }
  return null;
}

/**
 * The item the dragged one should be inserted before inside `zone`, or null
 * to append.
 *
 * A zone may wrap at two columns, so it holds several visual rows: pick the
 * row the cursor is over, then the first item in it whose centre is still
 * right of the cursor; past every item in the row, the next row's first. A
 * row holding one item is full-width, and there the cursor's side of its
 * vertical middle decides, since a stack of full-width items is read down the
 * page.
 */
export function insertBefore(
  zone: HTMLElement,
  x: number,
  y: number,
  itemAttr: string
): string | null {
  const items = [...zone.querySelectorAll<HTMLElement>(`[${itemAttr}]`)];
  if (items.length === 0) return null;

  const rows: { top: number; bottom: number; items: HTMLElement[] }[] = [];
  for (const item of items) {
    const r = item.getBoundingClientRect();
    const row = rows.find((candidate) => Math.abs(candidate.top - r.top) < 4);
    if (row) {
      row.bottom = Math.max(row.bottom, r.bottom);
      row.items.push(item);
    } else {
      rows.push({ top: r.top, bottom: r.bottom, items: [item] });
    }
  }
  rows.sort((a, b) => a.top - b.top);

  // Below every row — the cursor is in the zone's bottom padding — the drop
  // appends to the last row; folding back to the first would land the item
  // near the top of a zone it was dropped at the bottom of.
  const found = rows.findIndex((row) => y < row.bottom);
  const rowIndex = found === -1 ? rows.length - 1 : found;
  const row = rows[rowIndex];

  const after =
    row.items.length === 1
      ? row.items.find((item) => {
          const r = item.getBoundingClientRect();
          return y < r.top + r.height / 2;
        })
      : row.items.find((item) => {
          const r = item.getBoundingClientRect();
          return r.left + r.width / 2 > x;
        });
  const target = after ?? rows[rowIndex + 1]?.items[0] ?? null;
  return target?.getAttribute(itemAttr) ?? null;
}

/**
 * Pointer-driven drag-and-drop for the dashboard grid: pressing an item's
 * handle lifts it out of the layout to follow the cursor, and a dashed
 * placeholder marks the slot it would take — in its own zone or any other
 * on the page.
 *
 * Native HTML5 drag can't do the cross-zone part (no drag image the page
 * controls, and `dragover` stops firing once a chart or map swallows the
 * events), so this listens on `document` for the whole gesture instead.
 */
export function useDrag({
  onDrop,
  attrs = { zone: DROP_ZONE_ATTR, item: DRAG_ITEM_ATTR },
  tilt = 2,
}: {
  /** Returns whether a change is pending — if so the drag ends on `finish()`. */
  onDrop: (id: string, slot: DropSlot) => boolean;
  /** The attributes naming this gesture's zones and items. */
  attrs?: { zone: string; item: string };
  /** The lifted item's rotation, in degrees. */
  tilt?: number;
}) {
  const { zone: zoneAttr, item: itemAttr } = attrs;
  const [state, setState] = useState<DragState | null>(null);
  // The item that just landed, for the caller's settle animation.
  const [landed, setLanded] = useState<string | null>(null);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });
  // The lifted item follows the cursor through the DOM, not through React
  // state: the grid attaches this to the item in flight.
  const liftedRef = useRef<HTMLDivElement | null>(null);
  // The gesture reads the freshest handler without re-subscribing mid-drag.
  const dropRef = useRef(onDrop);
  useEffect(() => {
    dropRef.current = onDrop;
  });

  const start = useCallback(
    (
      event: React.PointerEvent,
      { id, key, beforeId, rect, grab }: DragStartArgs
    ) => {
      if (event.button !== 0) return;
      // Phosphor renders SVG handles, which the browser drags natively —
      // that hijacks the pointer stream this gesture needs.
      event.preventDefault();
      setState({
        id,
        key,
        beforeId,
        rect,
        grab,
        origin: { x: event.pageX, y: event.pageY },
      });
    },
    []
  );

  /** Ends a dropped drag; a no-op otherwise. */
  const finish = useCallback(() => {
    const current = stateRef.current;
    if (!current?.dropped) return;
    setLanded(current.id);
    setState(null);
  }, []);
  /** Forgets the landed item, once its settle animation has played. */
  const settle = useCallback(() => setLanded(null), []);

  // One origin per gesture, so the listeners subscribe once per drag and
  // let go at the drop.
  const origin = state && !state.dropped ? state.origin : null;

  useEffect(() => {
    if (!origin) return;
    // The lifted item stays mounted after the drop, so the transform written
    // here must be cleared on the way out or the item lands displaced.
    const lifted = liftedRef.current;
    if (lifted) lifted.style.transform = liftedTransform(0, 0, tilt);

    // The pointer in viewport coordinates; the page may scroll under it.
    const update = (x: number, y: number) => {
      if (lifted) {
        lifted.style.transform = liftedTransform(
          x + window.scrollX - origin.x,
          y + window.scrollY - origin.y,
          tilt
        );
      }
      // Between zones the slot stays where it was.
      const zone = zoneAt(x, y, zoneAttr);
      if (!zone) return;
      const key = zone.getAttribute(zoneAttr) ?? "";
      const beforeId = insertBefore(zone, x, y, itemAttr);
      // Same slot, same render: the grid only re-lays-out when the drop
      // target actually moves.
      setState((current) =>
        !current || (current.key === key && current.beforeId === beforeId)
          ? current
          : { ...current, key, beforeId }
      );
    };

    // While the pointer sits near an edge the page keeps scrolling, and the
    // slot and lifted item are re-resolved against the moved page each frame.
    let last = { x: 0, y: 0 };
    let frame = 0;
    const autoScroll = () => {
      const { y } = last;
      const overshoot =
        y < SCROLL_EDGE
          ? y - SCROLL_EDGE
          : y > window.innerHeight - SCROLL_EDGE
            ? y - (window.innerHeight - SCROLL_EDGE)
            : 0;
      if (overshoot === 0) {
        frame = 0;
        return;
      }
      window.scrollBy(0, (overshoot / SCROLL_EDGE) * SCROLL_MAX_STEP);
      update(last.x, last.y);
      frame = requestAnimationFrame(autoScroll);
    };

    const onMove = (event: PointerEvent) => {
      last = { x: event.clientX, y: event.clientY };
      update(last.x, last.y);
      if (!frame) frame = requestAnimationFrame(autoScroll);
    };

    const onUp = () => {
      const current = stateRef.current;
      if (!current) return;
      const pending = dropRef.current(current.id, {
        key: current.key,
        beforeId: current.beforeId,
      });
      setState(pending ? { ...current, dropped: true } : null);
    };

    // The browser aborted the gesture (touch scrolling taking over, say).
    // That is not a drop: the drag is forgotten and nothing is written, so a
    // cancelled interaction can never reorder anything.
    const onCancel = () => setState(null);

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onCancel);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onCancel);
      cancelAnimationFrame(frame);
      if (lifted) lifted.style.transform = "";
    };
  }, [origin, zoneAttr, itemAttr, tilt]);

  // Grabbing cursor and no text selection for the whole gesture, so dragging
  // across a chart or a note doesn't select its text.
  useEffect(() => {
    if (!origin) return;
    const { style } = document.body;
    const previous = { cursor: style.cursor, userSelect: style.userSelect };
    style.cursor = "grabbing";
    style.userSelect = "none";
    return () => {
      style.cursor = previous.cursor;
      style.userSelect = previous.userSelect;
    };
  }, [origin]);

  return { state, landed, start, finish, settle, liftedRef };
}
