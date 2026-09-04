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
  /** Where the item was lifted from; it stays this size while in flight. */
  rect: LiftedRect;
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
}: {
  onDrop: (id: string, slot: DropSlot) => void;
  /** The attributes naming this gesture's zones and items. */
  attrs?: { zone: string; item: string };
}) {
  const { zone: zoneAttr, item: itemAttr } = attrs;
  const [state, setState] = useState<DragState | null>(null);
  // The lifted item follows the cursor through the DOM, not through React
  // state: the grid attaches this to the item in flight.
  const liftedRef = useRef<HTMLDivElement | null>(null);
  // The gesture reads the freshest handler without re-subscribing mid-drag.
  const dropRef = useRef(onDrop);
  useEffect(() => {
    dropRef.current = onDrop;
  });

  const start = useCallback(
    (event: React.PointerEvent, { id, key, beforeId, rect }: DragStartArgs) => {
      if (event.button !== 0) return;
      // Phosphor renders SVG handles, which the browser drags natively —
      // that hijacks the pointer stream this gesture needs.
      event.preventDefault();
      setState({
        id,
        key,
        beforeId,
        rect,
        origin: { x: event.pageX, y: event.pageY },
      });
    },
    []
  );

  // One origin per drag, so the listeners subscribe once per gesture.
  const origin = state?.origin ?? null;

  useEffect(() => {
    if (!origin) return;
    // The lifted item stays mounted after the drop, so the transform written
    // here must be cleared on the way out or the item lands displaced.
    const lifted = liftedRef.current;

    const onMove = (event: PointerEvent) => {
      if (lifted) {
        lifted.style.transform = `translate3d(${event.pageX - origin.x}px, ${event.pageY - origin.y}px, 0)`;
      }
      // Between zones the slot stays where it was.
      const zone = zoneAt(event.clientX, event.clientY, zoneAttr);
      if (!zone) return;
      const key = zone.getAttribute(zoneAttr) ?? "";
      const beforeId = insertBefore(
        zone,
        event.clientX,
        event.clientY,
        itemAttr
      );
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
          dropRef.current(current.id, {
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
      if (lifted) lifted.style.transform = "";
    };
  }, [origin, zoneAttr, itemAttr]);

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

  return { state, start, liftedRef };
}
