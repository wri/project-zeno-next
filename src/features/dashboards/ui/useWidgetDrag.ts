"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Where a dragged widget would land: a container key and an index in it. */
export interface DropSlot {
  key: string;
  index: number;
}

export interface WidgetDragState extends DropSlot {
  widgetId: string;
  /** The container the drag started in — the slot to fall back to. */
  fromKey: string;
  /** Shown in the cursor-following ghost. */
  title: string;
  /** The dragged card's column span, so the drop slot matches its shape. */
  isDouble: boolean;
  /** The dragged card's own box, so the placeholder holds its space. */
  width: number;
  height: number;
  /**
   * Where the pointer was when the drag began — the ghost's first position.
   * It deliberately does not track the cursor: every later position is written
   * straight to the ghost's `transform` (see `ghostRef`), so a page of maps and
   * charts doesn't re-render on every pointer move.
   */
  origin: { x: number; y: number };
}

export interface DragStartArgs {
  widgetId: string;
  fromKey: string;
  title: string;
  isDouble: boolean;
  /** The widget's current index in `fromKey` — the slot a drag that goes
      nowhere drops back into. */
  index: number;
  /** The grid item being dragged — measured for the placeholder. */
  element: HTMLElement | null;
}

/** Drop zones name themselves; grid items name the widget they carry. */
export const DROP_ZONE_ATTR = "data-drop-zone";
export const DRAG_ITEM_ATTR = "data-drag-item";

function rectOf(el: Element) {
  return el.getBoundingClientRect();
}

/** The ghost's transform for a pointer position — offset clear of the cursor. */
export function ghostAt(x: number, y: number): string {
  return `translate3d(${x + 12}px, ${y + 12}px, 0) rotate(2deg)`;
}

/** The drop zone under the cursor, or null between zones. */
function zoneAt(x: number, y: number): HTMLElement | null {
  const zones = document.querySelectorAll<HTMLElement>(`[${DROP_ZONE_ATTR}]`);
  for (const zone of zones) {
    const r = rectOf(zone);
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return zone;
  }
  return null;
}

/**
 * The widget the dragged card should be inserted before inside `zone`, or null
 * to append.
 *
 * A zone wraps at two columns, so it holds several visual rows: pick the row
 * the cursor is over (the first whose bottom is past it), then the first card
 * in that row whose centre is still right of the cursor. Past every card in the
 * row, the slot is the next row's first card — which is what "after the last
 * card of this row" means once the rows are read as one sequence.
 *
 * A row holding one card is a full-width card, and there the cursor's side of
 * its *vertical* middle decides: a stack of full-width cards is read down the
 * page, so aiming at the right half of one has nothing to do with going after
 * it.
 */
export function insertBefore(
  zone: HTMLElement,
  x: number,
  y: number
): string | null {
  const items = [...zone.querySelectorAll<HTMLElement>(`[${DRAG_ITEM_ATTR}]`)];
  if (items.length === 0) return null;

  const rows: { top: number; bottom: number; items: HTMLElement[] }[] = [];
  for (const item of items) {
    const r = rectOf(item);
    const row = rows.find((candidate) => Math.abs(candidate.top - r.top) < 4);
    if (row) {
      row.bottom = Math.max(row.bottom, r.bottom);
      row.items.push(item);
    } else {
      rows.push({ top: r.top, bottom: r.bottom, items: [item] });
    }
  }
  rows.sort((a, b) => a.top - b.top);

  const rowIndex = Math.max(
    0,
    rows.findIndex((row) => y < row.bottom)
  );
  const row = rows[rowIndex] ?? rows[rows.length - 1];

  const after =
    row.items.length === 1
      ? row.items.find((item) => {
          const r = rectOf(item);
          return y < r.top + r.height / 2;
        })
      : row.items.find((item) => {
          const r = rectOf(item);
          return r.left + r.width / 2 > x;
        });
  const target = after ?? rows[rowIndex + 1]?.items[0] ?? null;
  return target?.getAttribute(DRAG_ITEM_ATTR) ?? null;
}

/**
 * Pointer-driven drag-and-drop for the dashboard grid, per the interaction
 * prototype: pressing a card's handle lifts it out of the layout, a ghost
 * follows the cursor, and a dashed placeholder marks the slot it would take —
 * in its own container or in any other one on the page.
 *
 * Native HTML5 drag can't do the cross-container part legibly (no ghost the
 * page controls, and `dragover` fires only over the source's own drop targets
 * once a chart or map swallows the events), so this listens on `document` for
 * the whole gesture instead.
 *
 * `resolveSlot` turns a hovered zone and an "insert before this widget" answer
 * into the index the caller's model wants; it reads the caller's own container
 * state, so this hook never needs to know the widget lists.
 */
export function useWidgetDrag({
  resolveSlot,
  onDrop,
}: {
  resolveSlot: (
    widgetId: string,
    zoneKey: string,
    beforeWidgetId: string | null
  ) => number;
  onDrop: (widgetId: string, slot: DropSlot) => void;
}) {
  const [state, setState] = useState<WidgetDragState | null>(null);
  // The ghost follows the cursor through the DOM, not through React state.
  const ghostRef = useRef<HTMLDivElement | null>(null);
  // The gesture reads the freshest resolver/handler without re-subscribing the
  // document listeners mid-drag.
  const resolveRef = useRef(resolveSlot);
  const dropRef = useRef(onDrop);
  resolveRef.current = resolveSlot;
  dropRef.current = onDrop;

  const start = useCallback(
    (
      event: React.PointerEvent,
      { widgetId, fromKey, title, isDouble, index, element }: DragStartArgs
    ) => {
      if (event.button !== 0) return;
      // Phosphor renders SVG handles, which the browser drags natively —
      // that hijacks the pointer stream this gesture needs.
      event.preventDefault();
      const box = element?.getBoundingClientRect();
      setState({
        widgetId,
        fromKey,
        title,
        isDouble,
        key: fromKey,
        index,
        width: box?.width ?? 0,
        height: box?.height ?? 0,
        origin: { x: event.clientX, y: event.clientY },
      });
    },
    []
  );

  const dragging = !!state;

  useEffect(() => {
    if (!dragging) return;

    const onMove = (event: PointerEvent) => {
      const { clientX: x, clientY: y } = event;
      if (ghostRef.current) ghostRef.current.style.transform = ghostAt(x, y);
      setState((current) => {
        if (!current) return current;
        const zone = zoneAt(x, y);
        const key = zone?.getAttribute(DROP_ZONE_ATTR) ?? current.key;
        const index = zone
          ? resolveRef.current(current.widgetId, key, insertBefore(zone, x, y))
          : current.index;
        // Same slot, same render: the grid only re-lays-out when the drop
        // target actually moves.
        return key === current.key && index === current.index
          ? current
          : { ...current, key, index };
      });
    };

    const onUp = () => {
      setState((current) => {
        if (current) {
          dropRef.current(current.widgetId, {
            key: current.key,
            index: current.index,
          });
        }
        return null;
      });
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
    };
  }, [dragging]);

  // Grabbing cursor and no text selection for the whole gesture, so dragging
  // across a chart or a note doesn't select its text.
  useEffect(() => {
    if (!dragging) return;
    const { style } = document.body;
    const previous = { cursor: style.cursor, userSelect: style.userSelect };
    style.cursor = "grabbing";
    style.userSelect = "none";
    return () => {
      style.cursor = previous.cursor;
      style.userSelect = previous.userSelect;
    };
  }, [dragging]);

  return { state, start, ghostRef };
}
