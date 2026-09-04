"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Where a dragged widget would land: a container key and the widget the slot
 * sits in front of there, or null for "after everything".
 */
export interface DropSlot {
  key: string;
  beforeId: string | null;
}

export interface WidgetDragState extends DropSlot {
  widgetId: string;
  /** Shown in the cursor-following ghost. */
  title: string;
  /** The dragged card's own box, so the placeholder holds its space. */
  width: number;
  height: number;
  /**
   * The pointer at drag start — the ghost's first position. Every later
   * position is written straight to the ghost's `transform` (see `ghostRef`)
   * so a page of maps and charts doesn't re-render on every pointer move.
   */
  origin: { x: number; y: number };
}

export interface DragStartArgs extends DropSlot {
  widgetId: string;
  title: string;
  /** The grid item being dragged — measured for the placeholder. */
  element: HTMLElement | null;
}

/** Drop zones name themselves; grid items name the widget they carry. */
export const DROP_ZONE_ATTR = "data-drop-zone";
export const DRAG_ITEM_ATTR = "data-drag-item";

/** The ghost's transform for a pointer position — offset clear of the cursor. */
export function ghostAt(x: number, y: number): string {
  return `translate3d(${x + 12}px, ${y + 12}px, 0) rotate(2deg)`;
}

/** The drop zone under the cursor, or null between zones. */
function zoneAt(x: number, y: number): HTMLElement | null {
  const zones = document.querySelectorAll<HTMLElement>(`[${DROP_ZONE_ATTR}]`);
  for (const zone of zones) {
    const r = zone.getBoundingClientRect();
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return zone;
  }
  return null;
}

/**
 * The widget the dragged card should be inserted before inside `zone`, or null
 * to append.
 *
 * A zone wraps at two columns, so it holds several visual rows: pick the row
 * the cursor is over, then the first card in it whose centre is still right of
 * the cursor; past every card in the row, the next row's first card. A row
 * holding one card is full-width, and there the cursor's side of its vertical
 * middle decides, since a stack of full-width cards is read down the page.
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

  const rowIndex = Math.max(
    0,
    rows.findIndex((row) => y < row.bottom)
  );
  const row = rows[rowIndex] ?? rows[rows.length - 1];

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
  return target?.getAttribute(DRAG_ITEM_ATTR) ?? null;
}

/**
 * Pointer-driven drag-and-drop for the dashboard grid: pressing a card's
 * handle lifts it, a ghost follows the cursor, and a dashed placeholder marks
 * the slot it would take — in its own container or any other on the page.
 *
 * Native HTML5 drag can't do the cross-container part (no ghost the page
 * controls, and `dragover` stops firing once a chart or map swallows the
 * events), so this listens on `document` for the whole gesture instead.
 */
export function useWidgetDrag({
  onDrop,
}: {
  onDrop: (widgetId: string, slot: DropSlot) => void;
}) {
  const [state, setState] = useState<WidgetDragState | null>(null);
  // The ghost follows the cursor through the DOM, not through React state.
  const ghostRef = useRef<HTMLDivElement | null>(null);
  // The gesture reads the freshest handler without re-subscribing mid-drag.
  const dropRef = useRef(onDrop);
  useEffect(() => {
    dropRef.current = onDrop;
  });

  const start = useCallback(
    (
      event: React.PointerEvent,
      { widgetId, key, beforeId, title, element }: DragStartArgs
    ) => {
      if (event.button !== 0) return;
      // Phosphor renders SVG handles, which the browser drags natively —
      // that hijacks the pointer stream this gesture needs.
      event.preventDefault();
      const box = element?.getBoundingClientRect();
      setState({
        widgetId,
        key,
        beforeId,
        title,
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
      // Between zones the slot stays where it was.
      const zone = zoneAt(x, y);
      if (!zone) return;
      const key = zone.getAttribute(DROP_ZONE_ATTR) ?? "";
      const beforeId = insertBefore(zone, x, y);
      // Same slot, same render: the grid only re-lays-out when the drop
      // target actually moves.
      setState((current) =>
        !current || (current.key === key && current.beforeId === beforeId)
          ? current
          : { ...current, key, beforeId }
      );
    };

    const onUp = () => {
      setState((current) => {
        if (current) {
          dropRef.current(current.widgetId, {
            key: current.key,
            beforeId: current.beforeId,
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
